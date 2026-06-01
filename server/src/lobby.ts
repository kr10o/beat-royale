// server/src/lobby.ts
import { DurableObject } from "cloudflare:workers";
import { Env } from "./index";

export class BattleLobbyDO extends DurableObject {
  env: Env;
  battleId: string;
  phase: 'idle' | 'producing' | 'voting' | 'finished' = 'idle';
  polls: { 1: number; 2: number } = { 1: 0, 2: 0 };
  voters = new Set<string>();
  pendingVoteBroadcast = false;
  
  // Anti-abuse tracking: { lastMessageTimestamp, lastMessageText, warningCount }
  userTrackers = new Map<string, { lastMsg: number, lastText: string, warnings: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.env = env;
    this.battleId = this.ctx.id.toString(); 
  }

  async fetch(request: Request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    this.ctx.acceptWebSocket(server);

    server.send(JSON.stringify({
      type: 'SYNC_STATE',
      phase: this.phase,
      polls: this.polls
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let data;
    try {
      data = typeof message === 'string' ? JSON.parse(message) : {};
    } catch (e) {
      ws.close(1008, "Invalid payload");
      return;
    }

    if (data.type === 'HOST_START_BATTLE') {
      this.phase = 'producing';
      const durationMs = 10 * 60 * 1000; 
      const endTime = Date.now() + durationMs;
      
      await this.ctx.storage.setAlarm(endTime);
      this.broadcast({ type: 'TIMER_SYNC', endTime, durationMs });
      return;
    }

    if (data.type === 'CHAT_MESSAGE') {
      const { userId, text: rawText, user } = data;
      const text = rawText ? rawText.trim() : '';
      const now = Date.now();

      if (!text || text.length > 200) return; // Clamping massive payloads silently

      const tracker = this.userTrackers.get(userId) || { lastMsg: 0, lastText: '', warnings: 0 };

      // Rate Limiting Cooldown: Enforce 1.5 second intervals
      if (now - tracker.lastMsg < 1500) {
        tracker.warnings++;
        this.userTrackers.set(userId, tracker);
        if (tracker.warnings > 5) {
          ws.close(1008, "Spam detected.");
        }
        return; 
      }

      // Deduplication Protocol
      if (text.toLowerCase() === tracker.lastText.toLowerCase()) {
        tracker.lastMsg = now;
        this.userTrackers.set(userId, tracker);
        return; 
      }

      tracker.lastMsg = now;
      tracker.lastText = text;
      tracker.warnings = Math.max(0, tracker.warnings - 1);
      this.userTrackers.set(userId, tracker);

      const isVotePhase = this.phase === 'voting';
      if (isVotePhase && (text === '1' || text === '2') && !this.voters.has(userId)) {
        this.polls[text as '1' | '2']++;
        this.voters.add(userId);
        this.scheduleVoteBroadcast();
      }

      this.broadcast({ type: 'CHAT', user, text });
    }
  }

  async alarm(): Promise<void> {
    if (this.phase === 'producing') {
      this.phase = 'voting';
      const votingDurationMs = 60 * 1000;
      await this.ctx.storage.setAlarm(Date.now() + votingDurationMs);
      
      this.broadcast({ 
        type: 'PHASE_CHANGE', 
        phase: 'voting', 
        message: 'Time is up! You have 60 seconds to vote!' 
      });
      return;
    }

    if (this.phase === 'voting') {
      this.phase = 'finished';
      
      const winnerId = this.polls[1] > this.polls[2] ? "producer_1" : 
                       this.polls[2] > this.polls[1] ? "producer_2" : 'TIE';

      try {
        await this.env.DB.prepare(
          `UPDATE battles SET winner_id = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(winnerId, this.battleId).run();
      } catch (error) {
        console.error("DB persistence failed:", error);
      }

      this.broadcast({ type: 'BATTLE_OVER', winnerId, finalPolls: this.polls });
      this.ctx.getWebSockets().forEach(ws => {
        try {
          ws.close(1000, "Battle Concluded");
        } catch (e) {
          // ignore already closed
        }
      });
    }
  }

  broadcast(messageObj: object) {
    const payload = JSON.stringify(messageObj);
    this.ctx.getWebSockets().forEach(socket => {
      try {
        socket.send(payload);
      } catch (e) {
        // ignore closed or errored sockets
      }
    });
  }

  scheduleVoteBroadcast() {
    if (!this.pendingVoteBroadcast) {
      this.pendingVoteBroadcast = true;
      setTimeout(() => {
        this.broadcast({ type: 'POLL_UPDATE', polls: this.polls });
        this.pendingVoteBroadcast = false;
      }, 250);
    }
  }
}
