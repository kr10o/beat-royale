<!-- pages/profile/[id].vue -->
<template>
  <div class="profile-page">
    <div class="grid-overlay"></div>
    <div class="glow-orb blue"></div>

    <header class="navbar">
      <NuxtLink to="/" class="logo">BEAT <span class="accent">ROYALE</span></NuxtLink>
      <NuxtLink to="/battle/main-stage" class="lobby-cta">JOIN LIVE BATTLE</NuxtLink>
    </header>

    <div class="profile-wrapper">
      <div v-if="pending" class="status-box">
        <div class="spinner"></div>
        <p>Loading database portfolio state...</p>
      </div>

      <div v-else-if="error || !profile" class="status-box error">
        <p>⚠️ PROFILE NOT FOUND OR DATABASE OFFLINE.</p>
        <NuxtLink to="/" class="back-home">Return to Home Screen</NuxtLink>
      </div>

      <div v-else class="profile-grid">
        <!-- Sidebar ELO Display -->
        <div class="sidebar">
          <div class="user-identity">
            <div class="avatar-large">🎹</div>
            <h1 class="username">{{ profile.display_name }}</h1>
            <p class="role-badge">{{ profile.role ? profile.role.toUpperCase() : 'PLAYER' }}</p>
            <p class="join-date">Registered {{ formatDate(profile.created_at) }}</p>
          </div>

          <EloRankDisplay 
            :elo-ranking="profile.elo_ranking || 1200"
            :win-count="profile.win_count || 0"
            :loss-count="profile.loss_count || 0"
            :prestige-title="profile.prestige_title || 'Rookie'"
          />
        </div>

        <!-- Main Content Area -->
        <div class="main-content">
          <InventoryGrid :items="inventory?.items || []" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useFetch } from '#app';
import { useApi } from '~/composables/useApi';
import EloRankDisplay from '~/components/dashboard/EloRankDisplay.vue';
import InventoryGrid from '~/components/dashboard/InventoryGrid.vue';

const route = useRoute();
const { apiBase } = useApi();

// Edge-SSR fetch against the configured Worker origin (works on server + client).
const { data: profile, pending, error } = await useFetch(`${apiBase}/api/profiles/${route.params.id}`, {
  credentials: 'include',
});

// Real inventory for this producer (empty array → InventoryGrid shows empty state).
const { data: inventory } = await useFetch(`${apiBase}/api/inventory/${route.params.id}`, {
  credentials: 'include',
  default: () => ({ items: [] }),
});

const formatDate = (dateStr) => {
  if (!dateStr) return 'Recently';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: #050508;
  color: #fff;
  font-family: 'Inter', sans-serif;
  position: relative;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: 40px 40px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  pointer-events: none;
  z-index: 1;
}

.glow-orb {
  position: absolute;
  width: 650px;
  height: 650px;
  border-radius: 50%;
  filter: blur(140px);
  opacity: 0.15;
  pointer-events: none;
  z-index: 1;
}

.glow-orb.blue {
  top: 10%;
  left: -10%;
  background: #00f2fe;
}

.navbar {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.logo {
  font-family: 'Outfit', sans-serif;
  font-size: 1.3rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
  text-decoration: none;
}

.logo .accent {
  color: #00f2fe;
}

.lobby-cta {
  background: rgba(0, 242, 254, 0.1);
  border: 1px solid rgba(0, 242, 254, 0.4);
  color: #00f2fe;
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  padding: 10px 20px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.lobby-cta:hover {
  background: #00f2fe;
  color: #000;
  box-shadow: 0 0 10px rgba(0, 242, 254, 0.3);
}

.profile-wrapper {
  position: relative;
  z-index: 5;
  flex-grow: 1;
  padding: 48px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.status-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 64px 24px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 242, 254, 0.1);
  border-top-color: #00f2fe;
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.status-box.error p {
  color: #ff007f;
  font-weight: 700;
}

.back-home {
  color: #8c8c9e;
  text-decoration: underline;
  font-size: 0.9rem;
}

.profile-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 40px;
  align-items: start;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.user-identity {
  background: rgba(18, 18, 24, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.avatar-large {
  font-size: 3.5rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.username {
  font-family: 'Outfit', sans-serif;
  font-size: 1.4rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.01em;
}

.role-badge {
  font-size: 0.6rem;
  font-weight: 800;
  color: #00f2fe;
  background: rgba(0, 242, 254, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
  margin-top: 6px;
  letter-spacing: 0.05em;
}

.join-date {
  font-size: 0.7rem;
  color: #555562;
  margin-top: 12px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
