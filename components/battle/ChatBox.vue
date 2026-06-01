<!-- components/battle/ChatBox.vue -->
<template>
  <div class="chat-wrapper">
    <div class="chat-header">
      <div class="status-indicator">
        <span class="pulse-dot"></span>
        <span class="header-text">LIVE SPECTATOR FEED</span>
      </div>
      <div class="spectators-count">👥 2.4k watching</div>
    </div>

    <!-- Message log list -->
    <div class="chat-log" ref="chatLogRef">
      <div v-for="(msg, i) in messages" :key="i" class="chat-line">
        <span class="user-badge" :style="{ color: getBadgeColor(msg.user) }">
          [{{ msg.user.toUpperCase() }}]
        </span>
        <span class="user-text">{{ msg.text }}</span>
      </div>
      <div v-if="messages.length === 0" class="chat-empty">
        <p>Chat initialized. Send "1" or "2" to vote during the audition phase!</p>
      </div>
    </div>

    <!-- Input Box -->
    <form @submit.prevent="sendMessage" class="chat-form">
      <input 
        type="text" 
        v-model="inputMsg" 
        placeholder="Type a message..." 
        :disabled="cooldownActive"
        class="chat-input"
        maxlength="200"
      />
      <button type="submit" class="send-btn" :disabled="cooldownActive || !inputMsg.trim()">
        {{ cooldownActive ? 'WAIT' : 'SEND' }}
      </button>
    </form>

    <!-- Cooldown Indicator -->
    <div v-if="cooldownActive" class="cooldown-banner">
      Slow mode active: Wait 1.5s between messages.
    </div>
  </div>
</template>

<script setup>
import { ref, onUpdated, nextTick } from 'vue';

const props = defineProps({
  messages: { type: Array, default: () => [] }
});

const emit = defineEmits(['send-chat']);

const inputMsg = ref('');
const cooldownActive = ref(false);
const chatLogRef = ref(null);

const sendMessage = () => {
  if (!inputMsg.value.trim() || cooldownActive.value) return;

  // Emit chat message up to parent connection pool
  emit('send-chat', inputMsg.value.trim());
  inputMsg.value = '';

  // Trigger local client cooldown (1.5 seconds)
  cooldownActive.value = true;
  setTimeout(() => {
    cooldownActive.value = false;
  }, 1500);
};

const getBadgeColor = (user) => {
  // Return deterministic neon color based on username
  const hash = user.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['#00f2fe', '#ff007f', '#39ff14', '#bbf013', '#f39c12', '#9b59b6'];
  return colors[hash % colors.length];
};

// Auto scroll chat log on updates
onUpdated(() => {
  nextTick(() => {
    if (chatLogRef.value) {
      chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(10, 10, 14, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: #ff007f;
  border-radius: 50%;
  box-shadow: 0 0 8px #ff007f;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

.header-text {
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #fff;
}

.spectators-count {
  font-size: 0.7rem;
  color: #606072;
  font-weight: 700;
}

.chat-log {
  flex-grow: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
}

.chat-line {
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  line-height: 1.4;
  word-break: break-word;
}

.user-badge {
  font-weight: 800;
  font-family: 'Outfit', sans-serif;
  margin-right: 8px;
  font-size: 0.75rem;
}

.user-text {
  color: #d1d1db;
}

.chat-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #555565;
  text-align: center;
  font-size: 0.75rem;
  padding: 24px;
}

.chat-form {
  display: flex;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  gap: 8px;
}

.chat-input {
  flex-grow: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #fff;
  padding: 10px 14px;
  font-size: 0.85rem;
  outline: none;
  transition: all 0.2s ease;
}

.chat-input:focus {
  border-color: #ff007f;
  background: rgba(255, 255, 255, 0.06);
}

.chat-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  background: #ff007f;
  color: #fff;
  border: none;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  background: #d00062;
  box-shadow: 0 0 10px rgba(255, 0, 127, 0.3);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cooldown-banner {
  background: rgba(255, 0, 127, 0.1);
  color: #ff007f;
  font-size: 0.65rem;
  font-weight: 800;
  text-align: center;
  padding: 4px;
  border-top: 1px solid rgba(255, 0, 127, 0.15);
  letter-spacing: 0.05em;
}
</style>
