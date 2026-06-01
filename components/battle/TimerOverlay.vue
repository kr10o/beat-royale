<!-- components/battle/TimerOverlay.vue -->
<template>
  <div class="timer-card" :class="{ urgency: remainingSeconds <= 30 }">
    <div class="timer-display">
      <span class="pulse-ring" v-if="remainingSeconds <= 30"></span>
      <span class="label">BATTLE TIME REMAINING</span>
      <span class="time-clock">{{ timeDisplay }}</span>
    </div>
    <div class="progress-bar-container">
      <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, computed } from 'vue';

const props = defineProps({
  endTime: { type: Number, required: true },
  durationMs: { type: Number, default: 10 * 60 * 1000 } // Default 10 mins
});

const emit = defineEmits(['time-expired']);

const remainingMs = ref(0);
let animationFrameId = null;

const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1000));

const timeDisplay = computed(() => {
  const totalSecs = remainingSeconds.value;
  if (totalSecs <= 0) return '00:00';
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
});

const progressPercent = computed(() => {
  if (props.durationMs <= 0) return 0;
  return Math.min(100, Math.max(0, (remainingMs.value / props.durationMs) * 100));
});

const startCountdown = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  const tick = () => {
    const now = Date.now();
    const diff = props.endTime - now;
    
    if (diff <= 0) {
      remainingMs.value = 0;
      emit('time-expired');
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    } else {
      remainingMs.value = diff;
      animationFrameId = requestAnimationFrame(tick);
    }
  };

  tick();
};

watch(() => props.endTime, () => {
  if (props.endTime > 0) {
    startCountdown();
  }
}, { immediate: true });

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style scoped>
.timer-card {
  background: rgba(18, 18, 24, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 20px;
  width: 220px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.timer-card.urgency {
  border-color: #ff007f;
  box-shadow: 0 0 15px rgba(255, 0, 127, 0.3);
}

.timer-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border: 2px solid #ff007f;
  border-radius: 50%;
  opacity: 0;
  animation: ripple 1.2s infinite ease-out;
  pointer-events: none;
  z-index: -1;
}

@keyframes ripple {
  0% { width: 60px; height: 60px; opacity: 0.5; }
  100% { width: 160px; height: 160px; opacity: 0; }
}

.label {
  font-size: 0.55rem;
  font-weight: 900;
  color: #606072;
  letter-spacing: 0.15em;
}

.time-clock {
  font-family: 'Outfit', sans-serif;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
}

.timer-card.urgency .time-clock {
  color: #ff007f;
  text-shadow: 0 0 8px rgba(255, 0, 127, 0.4);
}

.progress-bar-container {
  height: 3px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 1.5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00f2fe 0%, #ff007f 100%);
  border-radius: 1.5px;
  transition: width 0.1s linear;
}

.timer-card.urgency .progress-fill {
  background: #ff007f;
  box-shadow: 0 0 6px #ff007f;
}
</style>
