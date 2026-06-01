<!-- components/dashboard/EloRankDisplay.vue -->
<template>
  <div class="elo-card">
    <div class="glow-effect"></div>
    <div class="card-inner">
      <div class="header">
        <span class="prestige-badge">{{ prestigeTitle || 'ROOKIE PRODUCER' }}</span>
        <div class="rank-badge">🏆 LEVEL {{ rankLevel }}</div>
      </div>
      
      <div class="score-display">
        <h3 class="elo-score">{{ eloRanking }}</h3>
        <p class="elo-label">COMPETITIVE ELO SCORE</p>
      </div>

      <div class="stats-bar">
        <div class="stat-box">
          <span class="value wins">{{ winCount }}</span>
          <span class="label">BATTLES WON</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-box">
          <span class="value win-ratio">{{ winRate }}%</span>
          <span class="label">WIN RATIO</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-box">
          <span class="value losses">{{ lossCount }}</span>
          <span class="label">DEFEATS</span>
        </div>
      </div>

      <!-- ELO Progress Bar -->
      <div class="progress-section">
        <div class="progress-header">
          <span>PROGRESS TO NEXT TIER</span>
          <span>{{ progressPercent }}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  eloRanking: { type: Number, default: 1200 },
  winCount: { type: Number, default: 0 },
  lossCount: { type: Number, default: 0 },
  prestigeTitle: { type: String, default: 'Rookie' }
});

const totalBattles = computed(() => props.winCount + props.lossCount);
const winRate = computed(() => {
  if (totalBattles.value === 0) return 0;
  return Math.round((props.winCount / totalBattles.value) * 100);
});

const rankLevel = computed(() => {
  return Math.floor(props.eloRanking / 200) - 4; // E.g., 1200 ELO = LEVEL 2, 1600 ELO = LEVEL 4
});

const progressPercent = computed(() => {
  return (props.eloRanking % 200) / 2; // ELO remainder scaled to 100%
});
</script>

<style scoped>
.elo-card {
  position: relative;
  background: linear-gradient(135deg, #101015 0%, #151522 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}

.glow-effect {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(0, 242, 254, 0.08) 0%, transparent 60%);
  pointer-events: none;
}

.card-inner {
  position: relative;
  z-index: 2;
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.prestige-badge {
  font-family: 'Outfit', sans-serif;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #ff007f;
  background: rgba(255, 0, 127, 0.12);
  border: 1px solid rgba(255, 0, 127, 0.3);
  padding: 4px 10px;
  border-radius: 99px;
  text-transform: uppercase;
}

.rank-badge {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #39ff14;
  background: rgba(57, 255, 20, 0.08);
  border: 1px solid rgba(57, 255, 20, 0.2);
  padding: 4px 10px;
  border-radius: 6px;
}

.score-display {
  text-align: center;
  margin-bottom: 24px;
}

.elo-score {
  font-family: 'Outfit', sans-serif;
  font-size: 3.5rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1;
  text-shadow: 0 4px 12px rgba(0, 242, 254, 0.3);
}

.elo-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: #8c8c9e;
  letter-spacing: 0.2em;
  margin-top: 6px;
}

.stats-bar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-box .value {
  font-size: 1.1rem;
  font-weight: 800;
  color: #fff;
}

.stat-box .value.wins {
  color: #00f2fe;
}

.stat-box .value.losses {
  color: #ff007f;
}

.stat-box .value.win-ratio {
  color: #39ff14;
}

.stat-box .label {
  font-size: 0.55rem;
  font-weight: 700;
  color: #606072;
  letter-spacing: 0.1em;
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.08);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
  font-weight: 800;
  color: #8c8c9e;
  letter-spacing: 0.05em;
}

.progress-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00f2fe 0%, #ff007f 100%);
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(0, 242, 254, 0.5);
  transition: width 0.6s ease-in-out;
}
</style>
