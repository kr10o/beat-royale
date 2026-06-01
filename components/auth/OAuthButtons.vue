<!-- components/auth/OAuthButtons.vue -->
<template>
  <div class="oauth-section">
    <div class="divider">
      <span>OR SYNC PORTFOLIO VIA</span>
    </div>
    
    <div class="oauth-grid">
      <button @click="triggerSSO('discord')" class="oauth-btn discord">
        <span class="btn-icon">👾</span> Discord
      </button>
      <button @click="triggerSSO('spotify')" class="oauth-btn spotify">
        <span class="btn-icon">🎵</span> Spotify
      </button>
      <button @click="triggerSSO('google')" class="oauth-btn google">
        <span class="btn-icon">🔍</span> Google
      </button>
      <button @click="triggerSSO('apple')" class="oauth-btn apple">
        <span class="btn-icon">🍎</span> Apple
      </button>
    </div>
  </div>
</template>

<script setup>
import { useApi } from '~/composables/useApi';

const emit = defineEmits(['sso-trigger']);
const { oauthUrl } = useApi();

const triggerSSO = (provider) => {
  emit('sso-trigger', provider);
  // Redirect to the Worker's OAuth entrypoint, which runs the full
  // authorization-code flow. Providers without configured credentials
  // respond 501 rather than crashing.
  window.location.href = oauthUrl(provider);
};
</script>

<style scoped>
.oauth-section {
  width: 100%;
  max-width: 480px;
  margin-top: 24px;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #707080;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  margin-bottom: 20px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.divider:not(:empty)::before {
  margin-right: .75em;
}

.divider:not(:empty)::after {
  margin-left: .75em;
}

.oauth-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.oauth-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: #c5c5d2;
  padding: 10px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-icon {
  font-size: 1rem;
}

.oauth-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  transform: translateY(-1px);
}

.oauth-btn.discord:hover {
  background: rgba(88, 101, 242, 0.15);
  border-color: rgb(88, 101, 242);
  color: #7289da;
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.2);
}

.oauth-btn.spotify:hover {
  background: rgba(30, 215, 96, 0.15);
  border-color: rgb(30, 215, 96);
  color: #1ed760;
  box-shadow: 0 4px 12px rgba(30, 215, 96, 0.2);
}
</style>
