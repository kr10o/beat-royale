-- server/db/schema.sql
-- Executed via: npx wrangler d1 execute beat_royale_db --file=./server/db/schema.sql

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  oauth_provider TEXT, -- 'discord', 'spotify', 'google', 'apple'
  oauth_id TEXT,
  role TEXT DEFAULT 'player', -- 'player', 'spectator', 'admin', 'vip_host'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT UNIQUE NOT NULL,
  elo_ranking INTEGER DEFAULT 1200,
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  prestige_title TEXT, 
  preferences_json TEXT, 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_type TEXT, -- 'sample_pack', 'badge', 'vst_skin'
  item_id TEXT NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE social_graph (
  user_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relationship_type TEXT, -- 'friend', 'rival', 'blocked'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, target_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE battles (
  id TEXT PRIMARY KEY,
  lobby_name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  winner_id TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  prize_pool_cents INTEGER DEFAULT 0
);
