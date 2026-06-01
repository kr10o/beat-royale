<!-- components/dashboard/InventoryGrid.vue -->
<template>
  <div class="inventory-container">
    <div class="filter-header">
      <h3 class="title">COLLECTED ITEMS</h3>
      <div class="tabs">
        <button 
          v-for="tab in ['all', 'sample_pack', 'badge', 'vst_skin']" 
          :key="tab" 
          @click="activeTab = tab"
          :class="['tab-btn', { active: activeTab === tab }]"
        >
          {{ tab.replace('_', ' ') }}
        </button>
      </div>
    </div>

    <div v-if="filteredItems.length === 0" class="empty-inventory">
      <p class="empty-text">No digital assets unlocked in this category yet.</p>
      <button class="unlock-btn">VISIT AUDIO SHOP</button>
    </div>

    <div v-else class="items-grid">
      <div 
        v-for="item in filteredItems" 
        :key="item.id" 
        class="item-card"
        :class="item.item_type"
      >
        <div class="item-visual">
          <span class="icon">{{ getItemIcon(item.item_type) }}</span>
          <span class="badge" v-if="item.isNew">NEW</span>
        </div>
        <div class="item-info">
          <h4 class="item-name">{{ item.name }}</h4>
          <span class="item-category">{{ item.item_type.replace('_', ' ').toUpperCase() }}</span>
          <p class="item-meta">Unlocked {{ formatDate(item.unlocked_at) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => [
      { id: '1', item_type: 'sample_pack', name: 'Tokyo Phonk Essentials Vol. 1', unlocked_at: '2026-05-20T10:00:00Z', isNew: true },
      { id: '2', item_type: 'badge', name: 'Beta Battle Pioneer Badge', unlocked_at: '2026-05-01T12:00:00Z' },
      { id: '3', item_type: 'vst_skin', name: 'Neon Glitch OTT VST Skin', unlocked_at: '2026-05-15T15:30:00Z' },
      { id: '4', item_type: 'sample_pack', name: 'Liquid Drum & Bass Stems', unlocked_at: '2026-05-28T09:12:00Z', isNew: true },
      { id: '5', item_type: 'badge', name: '10-Win Battle Streak Badge', unlocked_at: '2026-05-18T18:00:00Z' }
    ]
  }
});

const activeTab = ref('all');

const filteredItems = computed(() => {
  if (activeTab.value === 'all') return props.items;
  return props.items.filter(item => item.item_type === activeTab.value);
});

const getItemIcon = (type) => {
  switch (type) {
    case 'sample_pack': return '💾';
    case 'badge': return '🎖️';
    case 'vst_skin': return '🎨';
    default: return '📦';
  }
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
</script>

<style scoped>
.inventory-container {
  background: rgba(18, 18, 24, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 16px;
}

.title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fff;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: #8c8c9e;
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.tab-btn.active {
  background: #00f2fe;
  color: #000;
  border-color: #00f2fe;
  box-shadow: 0 0 10px rgba(0, 242, 254, 0.2);
}

.empty-inventory {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
}

.empty-text {
  color: #606072;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.unlock-btn {
  background: none;
  border: 1px dashed rgba(0, 242, 254, 0.4);
  color: #00f2fe;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.unlock-btn:hover {
  background: rgba(0, 242, 254, 0.05);
  border-style: solid;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.item-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}

.item-card:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.05);
}

.item-card.sample_pack:hover {
  border-color: #00f2fe;
  box-shadow: 0 6px 18px rgba(0, 242, 254, 0.1);
}

.item-card.badge:hover {
  border-color: #ff007f;
  box-shadow: 0 6px 18px rgba(255, 0, 127, 0.1);
}

.item-card.vst_skin:hover {
  border-color: #39ff14;
  box-shadow: 0 6px 18px rgba(57, 255, 20, 0.1);
}

.item-visual {
  height: 80px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.item-visual .icon {
  font-size: 2.2rem;
}

.item-visual .badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: #39ff14;
  color: #000;
  font-size: 0.55rem;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name {
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.2;
  height: 34px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-category {
  font-size: 0.6rem;
  font-weight: 800;
  color: #8c8c9e;
  letter-spacing: 0.05em;
}

.item-meta {
  font-size: 0.65rem;
  color: #555562;
}
</style>
