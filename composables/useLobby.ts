// composables/useLobby.ts
import { ref } from 'vue';

export const useLobby = () => {
  const activeLobbyId = ref('main-stage');
  
  const getActiveLobbyInfo = async (lobbyId) => {
    // Return structured details for dynamic layout renders
    return {
      id: lobbyId,
      name: 'Main Stage Arena',
      activeCount: 12,
      spectators: '2.4k'
    };
  };

  return {
    activeLobbyId,
    getActiveLobbyInfo
  };
};
