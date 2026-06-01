<!-- components/battle/PollingBars.vue -->
<template>
  <div class="polling-card">
    <h4 class="title">LIVE AUDITION AUDIENCE VOTING</h4>
    
    <div class="stats-grid">
      <!-- Producer 1 -->
      <div class="producer-column p1">
        <div class="header">
          <span class="avatar">🔥</span>
          <div class="info">
            <span class="p-name">PRODUCER 1</span>
            <span class="vote-count">{{ polls[1] }} votes</span>
          </div>
        </div>
        <div class="bar-track">
          <div class="bar-fill p1" :style="{ width: `${p1Percent}%` }"></div>
        </div>
        <span class="percentage">{{ p1Percent }}%</span>
      </div>

      <!-- Divider -->
      <div class="vs-divider">VS</div>

      <!-- Producer 2 -->
      <div class="producer-column p2">
        <div class="header text-right">
          <div class="info">
            <span class="p-name">PRODUCER 2</span>
            <span class="vote-count">{{ polls[2] }} votes</span>
          </div>
          <span class="avatar">⚡</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill p2" :style="{ width: `${p2Percent}%` }"></div>
        </div>
        <span class="percentage">{{ p2Percent }}%</span>
      </div>
    </div>

    <div class="instruction">
      Type <strong class="color-p1">"1"</strong> or <strong class="color-p2">"2"</strong> in chat to cast your authoritative vote!
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  polls: {
    type: Object,
    default: () => ({ 1: 0, 2: 0 })
  }
});

const totalVotes = computed(() => {
  const sum = props.polls[1] + props.polls[2];
  return Math.max(1, sum); // prevent division by zero
});

const p1Percent = computed(() => {
  return Math.round((props.polls[1] / totalVotes.value) * 100);
});

const p2Percent = computed(() => {
  return Math.round((props.polls[2] / totalVotes.value) * 100);
});
</script>

<style scoped>
.polling-card {
  background: rgba(18, 18, 24, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.title {
  font-family: 'Outfit', sans-serif;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #8c8c9e;
  text-align: center;
  margin-bottom: 20px;
}

.stats-grid {
  display: flex;
  align-items: center;
  gap: 24px;
}

.producer-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.producer-column .header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.producer-column .header.text-right {
  justify-content: flex-end;
  text-align: right;
}

.avatar {
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 6px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.info {
  display: flex;
  flex-direction: column;
}

.p-name {
  font-size: 0.8rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.02em;
}

.vote-count {
  font-size: 0.7rem;
  color: #606072;
  font-weight: 600;
}

.bar-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.bar-fill.p1 {
  background: linear-gradient(90deg, #0072ff 0%, #00f2fe 100%);
  box-shadow: 0 0 8px rgba(0, 242, 254, 0.4);
}

.bar-fill.p2 {
  background: linear-gradient(90deg, #ff007f 0%, #ff55bb 100%);
  box-shadow: 0 0 8px rgba(255, 0, 127, 0.4);
}

.percentage {
  font-family: 'Outfit', sans-serif;
  font-size: 1.3rem;
  font-weight: 900;
  color: #fff;
}

.producer-column.p1 .percentage {
  color: #00f2fe;
}

.producer-column.p2 .percentage {
  color: #ff007f;
  text-align: right;
}

.vs-divider {
  font-family: 'Outfit', sans-serif;
  font-weight: 950;
  font-size: 0.9rem;
  color: #555562;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.instruction {
  margin-top: 20px;
  text-align: center;
  font-size: 0.72rem;
  color: #606072;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 12px;
}

.color-p1 {
  color: #00f2fe;
}

.color-p2 {
  color: #ff007f;
}
</style>
