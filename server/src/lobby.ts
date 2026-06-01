// server/src/lobby.ts
import { DurableObject } from "cloudflare:workers";
import { Env } from "./index";
import { elo } from "./rating";

type Phase = 'idle' | 'producing' | 'voting' | 'finished';

interface PersistedState {
  phase: Phase;
  polls: { 1: number; 2: number };
  voters: string[];
  endTime: number;
  battleId: string | null;
  producer1Id: string | null;
  producer2Id: string | null;
}

const PRODUCING_MS = 10 * 60 * 1000;
const VOTING_MS = 60 * 1000;

export class BattleLobbyDO extends DurableObject {
  env: Env;

  // Authoritative state. Mirrored to ctx.storage so it survives hibernation
  // between setAlarm() and alarm() firing.
  phase: Phase = 'idle';
  polls: { 1: number; 2: number } = { 1: 0, 2: 0 };
  voters = new Set<string>();
  endTime = 0;
  battleId: string | null = null;
  producer1Id: string | null = null;
  producer2Id: string | null = null;

  pendingVoteBroadcast = false;
  // Best-effort anti-abuse tracking (in-memory; resets on eviction).
  userTrackers = new Map<string, { lastMsg: number; lastText: string; warnings: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.env = env;
    // Rehydrate persisted state before handling any request/alarm.
    this.ctx.blockConcurrencyWhile(async () => {
      const saved = await this.ctx.storage.get<PersistedState>('state');
      if (saved) {
        this.phase = saved.phase;
        this.polls = saved.polls;
        this.voters = new Set(saved.voters);
        this.endTime = saved.endTime;
        this.battleId = saved.battleId;
        this.producer1Id = saved.producer1Id;
        this.producer2Id = saved.producer2Id;
      }
    });
  }

  private async persist() {
    const state: PersistedState = {
      phase: this.phase,
      polls: this.polls,
      voters: [...this.voters],
      endTime: this.endTime,
      battleId: this.battleId,
      producer1Id: this.producer1Id,
      producer2Id: this.producer2Id,
    };
    await this.ctx.storage.put('state', state);
  }

  async fetch(request: Request) {
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);

    server.send(JSON.stringify({
      type: 'SYNC_STATE',
      phase: this.phase,
      polls: this.polls,
      endTime: this.endTime,
      durationMs: PRODUCING_MS,
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let data: any;
    try {
      data = typeof message === 'string' ? JSON.parse(message) : {};
    } catch {
      ws.close(1008, "Invalid payload");
      return;
    }

    if (data.type === 'HOST_START_BATTLE') {
      if (this.phase !== 'idle') return; // already running
      this.phase = 'producing';
      this.endTime = Date.now() + PRODUCING_MS;
      this.battleId = data.battleId ?? this.battleId;
      this.producer1Id = data.producer1Id ?? this.producer1Id;
      this.producer2Id = data.producer2Id ?? this.producer2Id;
      await this.persist();

      if (this.battleId) {
        try {
          await this.env.DB.prepare(`UPDATE battles SET status = 'producing' WHERE id = ?`)
            .bind(this.battleId).run();
        } catch (e) {
          console.error('battle status update failed', e);
        }
      }

      await this.ctx.storage.setAlarm(this.endTime);
      this.broadcast({ type: 'TIMER_SYNC', endTime: this.endTime, durationMs: PRODUCING_MS });
      return;
    }

    if (data.type === 'CHAT_MESSAGE') {
      const { userId, text: rawText, user } = data;
      const text = rawText ? String(rawText).trim() : '';
      const now = Date.now();

      if (!text || text.length > 200) return; // clamp empty / oversized payloads

      const tracker = this.userTrackers.get(userId) || { lastMsg: 0, lastText: '', warnings: 0 };

      // Rate limiting: enforce 1.5s intervals.
      if (now - tracker.lastMsg < 1500) {
        tracker.warnings++;
        this.userTrackers.set(userId, tracker);
        if (tracker.warnings > 5) ws.close(1008, "Spam detected.");
        return;
      }

      // Deduplication.
      if (text.toLowerCase() === tracker.lastText.toLowerCase()) {
        tracker.lastMsg = now;
        this.userTrackers.set(userId, tracker);
        return;
      }

      tracker.lastMsg = now;
      tracker.lastText = text;
      tracker.warnings = Math.max(0, tracker.warnings - 1);
      this.userTrackers.set(userId, tracker);

      if (this.phase === 'voting' && (text === '1' || text === '2') && !this.voters.has(userId)) {
        this.polls[text as unknown as '1' | '2']++;
        this.voters.add(userId);
        await this.persist();
        this.scheduleVoteBroadcast();
      }

      this.broadcast({ type: 'CHAT', user, text });
    }
  }

  async alarm(): Promise<void> {
    if (this.phase === 'producing') {
      this.phase = 'voting';
      this.endTime = Date.now() + VOTING_MS;
      await this.persist();
      if (this.battleId) {
        try {
          await this.env.DB.prepare(`UPDATE battles SET status = 'voting' WHERE id = ?`).bind(this.battleId).run();
        } catch (e) { console.error(e); }
      }
      await this.ctx.storage.setAlarm(this.endTime);
      this.broadcast({
        type: 'PHASE_CHANGE',
        phase: 'voting',
        message: 'Time is up! You have 60 seconds to vote!',
      });
      return;
    }

    if (this.phase === 'voting') {
      this.phase = 'finished';
      await this.persist();

      const p1Won = this.polls[1] > this.polls[2];
      const tie = this.polls[1] === this.polls[2];

      // Resolve winner to a real user id when producers are known.
      let winnerId: string;
      if (tie) winnerId = 'TIE';
      else if (p1Won) winnerId = this.producer1Id || 'producer_1';
      else winnerId = this.producer2Id || 'producer_2';

      await this.finalizeBattle(winnerId, !tie, p1Won);

      this.broadcast({ type: 'BATTLE_OVER', winnerId, finalPolls: this.polls });
      this.ctx.getWebSockets().forEach((ws) => {
        try { ws.close(1000, "Battle Concluded"); } catch { /* already closed */ }
      });
    }
  }

  // Persist the result and update Elo / win-loss for the two producers.
  private async finalizeBattle(winnerId: string, hasWinner: boolean, p1Won: boolean) {
    if (!this.battleId) return;
    try {
      await this.env.DB.prepare(
        `UPDATE battles SET winner_id = ?, status = 'finished', ended_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(winnerId, this.battleId).run();

      if (hasWinner && this.producer1Id && this.producer2Id) {
        const p1 = await this.env.DB.prepare(`SELECT elo_ranking FROM profiles WHERE user_id = ?`)
          .bind(this.producer1Id).first<{ elo_ranking: number }>();
        const p2 = await this.env.DB.prepare(`SELECT elo_ranking FROM profiles WHERE user_id = ?`)
          .bind(this.producer2Id).first<{ elo_ranking: number }>();

        const r1 = p1?.elo_ranking ?? 1200;
        const r2 = p2?.elo_ranking ?? 1200;
        const [new1, new2] = elo(r1, r2, p1Won);

        await this.env.DB.batch([
          this.env.DB.prepare(
            `UPDATE profiles SET elo_ranking = ?, win_count = win_count + ?, loss_count = loss_count + ? WHERE user_id = ?`
          ).bind(new1, p1Won ? 1 : 0, p1Won ? 0 : 1, this.producer1Id),
          this.env.DB.prepare(
            `UPDATE profiles SET elo_ranking = ?, win_count = win_count + ?, loss_count = loss_count + ? WHERE user_id = ?`
          ).bind(new2, p1Won ? 0 : 1, p1Won ? 1 : 0, this.producer2Id),
        ]);
      }
    } catch (error) {
      console.error("Battle finalization failed:", error);
    }
  }

  broadcast(messageObj: object) {
    const payload = JSON.stringify(messageObj);
    this.ctx.getWebSockets().forEach((socket) => {
      try { socket.send(payload); } catch { /* ignore closed sockets */ }
    });
  }

  scheduleVoteBroadcast() {
    if (this.pendingVoteBroadcast) return;
    this.pendingVoteBroadcast = true;
    setTimeout(() => {
      this.broadcast({ type: 'POLL_UPDATE', polls: this.polls });
      this.pendingVoteBroadcast = false;
    }, 250);
  }
}
