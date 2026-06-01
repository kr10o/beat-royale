<!-- pages/battle/[lobbyId].vue -->
<template>
  <div class="battle-arena">
    <div class="battle-grid">
      <!-- Left Panel: DAW iframe Wrapper -->
      <div class="daw-panel">
        <!-- Floating State Indicator overlays -->
        <div class="hud-overlay">
          <div class="hud-left">
            <span class="battle-title-hud">LOBBY: {{ lobbyName.toUpperCase() }}</span>
            <div class="phase-indicator" :class="phase">
              <span class="dot"></span> PHASE: {{ phase.toUpperCase() }}
            </div>
          </div>
          <div class="hud-right" v-if="phase === 'producing' && endTime > 0">
            <TimerOverlay :end-time="endTime" :duration-ms="durationMs" @time-expired="handleTimeExpired" />
          </div>
        </div>

        <ClientOnly fallback-tag="div" fallback="BOOTING MULTIPLAYER AUDIO SYNTH ENGINE...">
          <iframe 
            ref="dawFrame"
            src="/daw-app.html" 
            class="daw-iframe"
            @load="setupDawCommunication"
          ></iframe>
        </ClientOnly>
      </div>

      <!-- Right Panel: Chat and Voting Poll logs -->
      <div class="control-panel">
        <!-- If phase is voting, render Polling statistics -->
        <div class="poll-section" v-if="phase === 'voting'">
          <PollingBars :polls="polls" />
        </div>

        <!-- System controls for battle test demonstration -->
        <div class="admin-testing-dashboard">
          <h4 class="admin-title">BATTLE CONSOLE</h4>
          <div class="btn-group">
            <button @click="triggerHostStart" :disabled="phase !== 'idle'" class="admin-btn play">
              START 10m TIMER
            </button>
            <button @click="forceLock" :disabled="phase !== 'producing'" class="admin-btn lock">
              FORCE LOCK DAW
            </button>
          </div>
          <p class="console-log">{{ sysConsoleLog }}</p>
        </div>

        <div class="chat-section">
          <ChatBox :messages="chatMessages" @send-chat="sendChatToSocket" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from '#app';
import { useApi } from '~/composables/useApi';
import { useAuth } from '~/composables/useAuth';
import TimerOverlay from '~/components/battle/TimerOverlay.vue';
import PollingBars from '~/components/battle/PollingBars.vue';
import ChatBox from '~/components/battle/ChatBox.vue';

const route = useRoute();
const { apiBase, lobbyWsUrl } = useApi();
const auth = useAuth();
const lobbyId = route.params.lobbyId || 'main-stage';
const lobbyName = ref(lobbyId);

const phase = ref('idle'); // idle, producing, voting, finished
const endTime = ref(0);
const durationMs = ref(10 * 60 * 1000);
const polls = ref({ 1: 0, 2: 0 });
const chatMessages = ref([]);
const sysConsoleLog = ref('Console initialized. Waiting for host to launch battle sequence...');

const dawFrame = ref(null);
let socket = null;

// Identify the participant. Authenticated users carry their real id (so votes
// dedup correctly and chat is attributed); anonymous spectators get an
// ephemeral id scoped to this tab.
const sessionUser = ref('Spectator_' + Math.floor(Math.random() * 900 + 100));
const sessionUserId = ref('anon_' + Math.floor(Math.random() * 1000000));

const setupDawCommunication = () => {
  console.log("DAW Iframe mounted successfully.");
  sysConsoleLog.value = "DAW audio interface sandbox compiled. Ready.";
};

// Start WS connection pool
onMounted(async () => {
  // Resolve the authenticated identity (if any) so chat/votes are attributed.
  await auth.checkSession();
  if (auth.isAuthenticated.value && auth.user.value) {
    sessionUserId.value = auth.user.value.id;
    sessionUser.value = auth.user.value.name;
  }

  const socketUrl = lobbyWsUrl(lobbyId);
  console.log(`Establishing socket connection to: ${socketUrl}`);
  sysConsoleLog.value = "Contacting edge coordinates...";

  socket = new WebSocket(socketUrl);

  socket.onopen = () => {
    sysConsoleLog.value = "WebSocket connection established with Cloudflare DO.";
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'SYNC_STATE') {
      phase.value = data.phase;
      polls.value = data.polls;
    }

    if (data.type === 'TIMER_SYNC') {
      phase.value = 'producing';
      endTime.value = data.endTime;
      durationMs.value = data.durationMs || (10 * 60 * 1000);
      sysConsoleLog.value = "Timer synchronized from DO. Sequence running.";
      
      // Dispatch START_TIMER event down to sandbox iframe
      if (dawFrame.value && dawFrame.value.contentWindow) {
        dawFrame.value.contentWindow.postMessage({ action: 'START_TIMER' }, '*');
      }
    }

    if (data.type === 'PHASE_CHANGE') {
      phase.value = data.phase;
      sysConsoleLog.value = `Phase shifted: ${data.phase}. ${data.message || ''}`;
      
      if (data.phase === 'voting') {
        // Dispatch LOCK_DAW event to sandbox iframe to halt synth outputs
        if (dawFrame.value && dawFrame.value.contentWindow) {
          dawFrame.value.contentWindow.postMessage({ action: 'LOCK_DAW' }, '*');
        }
      }
    }

    if (data.type === 'POLL_UPDATE') {
      polls.value = data.polls;
    }

    if (data.type === 'CHAT') {
      chatMessages.value.push({ user: data.user, text: data.text });
    }

    if (data.type === 'BATTLE_OVER') {
      phase.value = 'finished';
      sysConsoleLog.value = `Battle over. Winner: ${data.winnerId}! Closing session.`;
      alert(`BATTLE OVER! Winner is: ${data.winnerId.toUpperCase()}`);
    }
  };

  socket.onclose = () => {
    sysConsoleLog.value = "Connection terminated by edge server.";
  };

  // Cross-Window Listener catching Audio mix exports from the iframe DAW
  window.addEventListener('message', handleIframeMessage);
});

const handleIframeMessage = async (e) => {
  if (e.data?.action === 'MIX_EXPORTED') {
    const audioBlob = e.data.blob;
    sysConsoleLog.value = `Mix buffer compiled. ByteLength: ${audioBlob.size}. Retrieving presigned ticket...`;
    
    try {
      // 1. Fetch an upload ticket from the Worker.
      const response = await fetch(`${apiBase}/api/upload/presigned`, { credentials: 'include' });
      const { uploadUrl, objectKey } = await response.json();

      sysConsoleLog.value = "Upload ticket received. Streaming mix to R2 via the edge...";

      // 2. PUT the mix to the ticket URL; the Worker writes it into the R2 bucket.
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        body: audioBlob,
        headers: { 'Content-Type': 'audio/webm' }
      });
      if (!put.ok) throw new Error(`Upload rejected (${put.status})`);

      sysConsoleLog.value = `Mix upload finalized successfully! Asset path: ${objectKey}`;
      alert(`Audio mix uploaded successfully to R2!`);
    } catch (err) {
      sysConsoleLog.value = `Upload failure: ${err.message}`;
      console.error(err);
    }
  }
};

const triggerHostStart = async () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  // Persist a battle row first (requires an authenticated host) so the Durable
  // Object can record the winner and update Elo against a real id.
  let battleId = lobbyId;
  try {
    const res = await fetch(`${apiBase}/api/battles`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lobbyId,
        lobbyName: lobbyName.value,
        // Demo wiring: the host stands in as producer 1. A real match would set
        // both producer ids; Elo only applies when both are present server-side.
        producer1Id: auth.isAuthenticated.value ? auth.user.value?.id : null,
        producer2Id: null,
      }),
    });
    const data = await res.json();
    if (data.battleId) battleId = data.battleId;
    sysConsoleLog.value = res.ok ? 'Battle registered. Launching sequence...' : 'Starting battle (not persisted: host not authenticated).';
  } catch {
    sysConsoleLog.value = 'Starting battle (battle row not persisted).';
  }

  socket.send(JSON.stringify({
    type: 'HOST_START_BATTLE',
    battleId,
    producer1Id: auth.isAuthenticated.value ? auth.user.value?.id : null,
    producer2Id: null,
  }));
};

const forceLock = () => {
  // Directly trigger lock (emulates system clock timeout)
  if (dawFrame.value && dawFrame.value.contentWindow) {
    dawFrame.value.contentWindow.postMessage({ action: 'LOCK_DAW' }, '*');
  }
};

const handleTimeExpired = () => {
  sysConsoleLog.value = "Battle countdown reached zero! Locking DAW.";
};

const sendChatToSocket = (text) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'CHAT_MESSAGE',
      userId: sessionUserId.value,
      user: sessionUser.value,
      text
    }));
  }
};

onUnmounted(() => {
  if (socket) socket.close();
  window.removeEventListener('message', handleIframeMessage);
});
</script>

<style scoped>
.battle-arena {
  width: 100vw;
  height: 100vh;
  background-color: #050508;
  color: #fff;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

.battle-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  height: 100%;
}

.daw-panel {
  position: relative;
  height: 100%;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
}

.hud-overlay {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
  z-index: 10;
}

.hud-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(10, 10, 14, 0.85);
  backdrop-filter: blur(8px);
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  pointer-events: auto;
}

.hud-right {
  pointer-events: auto;
}

.battle-title-hud {
  font-family: 'Outfit', sans-serif;
  font-size: 0.85rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: #00f2fe;
}

.phase-indicator {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.phase-indicator.idle { color: #888899; }
.phase-indicator.producing { color: #39ff14; }
.phase-indicator.voting { color: #ff007f; }
.phase-indicator.finished { color: #00f2fe; }

.phase-indicator .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}

.daw-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #070708;
}

.control-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0a0a0f;
  padding: 16px;
  gap: 16px;
  overflow-y: auto;
}

.poll-section {
  flex-shrink: 0;
}

.admin-testing-dashboard {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.admin-title {
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #8c8c9e;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.admin-btn {
  flex: 1;
  border: none;
  padding: 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-btn.play {
  background: #39ff14;
  color: #000;
}

.admin-btn.lock {
  background: #ff007f;
  color: #fff;
}

.admin-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.admin-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.console-log {
  font-family: monospace;
  font-size: 0.65rem;
  color: #707082;
  word-break: break-all;
  background: rgba(0, 0, 0, 0.2);
  padding: 6px;
  border-radius: 4px;
}

.chat-section {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-height: 250px;
}

@media (max-width: 900px) {
  .battle-grid {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 400px;
  }
}
</style>
