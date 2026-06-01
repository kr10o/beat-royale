// stores/userStore.ts
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: '',
    displayName: 'Guest Producer',
    preferences: {
      theme: 'neon-dark',
      latencyCompensationMs: 15,
      midiInputEnabled: false,
      quantization: '16n'
    },
    eloRanking: 1200,
    winCount: 0,
    lossCount: 0
  }),
  actions: {
    setProfile(userId, displayName, elo, wins, losses) {
      this.userId = userId;
      this.displayName = displayName;
      this.eloRanking = elo || 1200;
      this.winCount = wins || 0;
      this.lossCount = losses || 0;
    },
    hydratePreferences(preferencesJson) {
      if (preferencesJson) {
        try {
          this.preferences = typeof preferencesJson === 'string' 
            ? JSON.parse(preferencesJson) 
            : preferencesJson;
        } catch (e) {
          console.error("Failed to parse user preferences JSON:", e);
        }
      }
    },
    updateElo(newElo) {
      this.eloRanking = newElo;
    }
  }
});
