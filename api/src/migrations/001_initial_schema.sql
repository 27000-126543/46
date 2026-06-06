CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS players (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  avatar VARCHAR(10) NOT NULL DEFAULT '🧑‍🔬',
  level INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL DEFAULT 0,
  gold INTEGER NOT NULL DEFAULT 5000,
  gems INTEGER NOT NULL DEFAULT 100,
  total_relic_value BIGINT NOT NULL DEFAULT 0,
  museum_score INTEGER NOT NULL DEFAULT 0,
  is_committee BOOLEAN NOT NULL DEFAULT FALSE,
  inventory JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) REFERENCES players(id) ON DELETE SET NULL,
  name VARCHAR(50) NOT NULL,
  profession VARCHAR(20) NOT NULL,
  skill_level INTEGER NOT NULL DEFAULT 1,
  luck INTEGER NOT NULL DEFAULT 5,
  rarity VARCHAR(20) NOT NULL DEFAULT 'common',
  avatar VARCHAR(10) NOT NULL,
  skills JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  is_recruited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) REFERENCES players(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  member_ids VARCHAR(64)[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ruins (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  civilization VARCHAR(20) NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  image VARCHAR(100),
  min_level INTEGER NOT NULL DEFAULT 1,
  estimated_time INTEGER NOT NULL DEFAULT 60,
  potential_relics VARCHAR(64)[] DEFAULT '{}',
  event_pool VARCHAR(64)[] DEFAULT '{}',
  rewards JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relics (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) REFERENCES players(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  civilization VARCHAR(20) NOT NULL,
  completeness INTEGER NOT NULL DEFAULT 100,
  rarity VARCHAR(20) NOT NULL DEFAULT 'common',
  historical_value INTEGER NOT NULL DEFAULT 0,
  estimated_price INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  image VARCHAR(100),
  fragments INTEGER NOT NULL DEFAULT 1,
  discovered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  repair_history JSONB DEFAULT '[]',
  in_museum BOOLEAN NOT NULL DEFAULT FALSE,
  on_market BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS materials (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) REFERENCES players(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  quality INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL DEFAULT 0,
  icon VARCHAR(10) DEFAULT '📦',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS explorations (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) REFERENCES players(id) ON DELETE CASCADE,
  ruin_id VARCHAR(64) REFERENCES ruins(id) ON DELETE SET NULL,
  team_id VARCHAR(64) REFERENCES teams(id) ON DELETE SET NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'exploring',
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  events_triggered JSONB DEFAULT '[]',
  relics_found VARCHAR(64)[] DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exploration_event_templates (
  template_id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  choices JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS museums (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL DEFAULT '我的博物馆',
  level INTEGER NOT NULL DEFAULT 1,
  ticket_price INTEGER NOT NULL DEFAULT 10,
  attractiveness INTEGER NOT NULL DEFAULT 0,
  halls JSONB DEFAULT '[]',
  layout JSONB DEFAULT '[]',
  income_history JSONB DEFAULT '[]',
  last_collect_time BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_listings (
  id VARCHAR(64) PRIMARY KEY,
  relic_id VARCHAR(64) REFERENCES relics(id) ON DELETE CASCADE,
  seller_id VARCHAR(64) REFERENCES players(id) ON DELETE CASCADE,
  seller_name VARCHAR(50) NOT NULL,
  price INTEGER NOT NULL,
  suggested_price_min INTEGER,
  suggested_price_max INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_approval',
  create_time TIMESTAMP NOT NULL DEFAULT NOW(),
  price_history JSONB DEFAULT '[]',
  approvals JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(64) PRIMARY KEY,
  player_id VARCHAR(64) REFERENCES players(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT,
  rarity VARCHAR(20),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exhibitions (
  id VARCHAR(64) PRIMARY KEY,
  week_start BIGINT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'registering',
  theme VARCHAR(20) NOT NULL DEFAULT 'mixed',
  registration_fee INTEGER NOT NULL DEFAULT 100,
  prize_pool INTEGER NOT NULL DEFAULT 0,
  start_time BIGINT,
  end_time BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exhibition_registrations (
  id VARCHAR(64) PRIMARY KEY,
  exhibition_id VARCHAR(64) REFERENCES exhibitions(id) ON DELETE CASCADE,
  player_id VARCHAR(64) REFERENCES players(id) ON DELETE CASCADE,
  player_name VARCHAR(50),
  avatar VARCHAR(10),
  exhibition_relics JSONB DEFAULT '[]',
  score INTEGER,
  rank INTEGER,
  registered_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS exhibition_matches (
  id VARCHAR(64) PRIMARY KEY,
  exhibition_id VARCHAR(64) REFERENCES exhibitions(id) ON DELETE CASCADE,
  player1_id VARCHAR(64) REFERENCES players(id) ON DELETE CASCADE,
  player2_id VARCHAR(64) REFERENCES players(id) ON DELETE CASCADE,
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  rounds JSONB DEFAULT '[]',
  events JSONB DEFAULT '[]',
  current_round INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS secret_realms (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  max_players INTEGER NOT NULL DEFAULT 100,
  current_players INTEGER NOT NULL DEFAULT 0,
  open_time TIMESTAMP,
  close_time TIMESTAMP,
  teams JSONB DEFAULT '[]',
  global_events JSONB DEFAULT '[]',
  rewards JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);
CREATE INDEX IF NOT EXISTS idx_relics_player ON relics(player_id);
CREATE INDEX IF NOT EXISTS idx_relics_civilization ON relics(civilization);
CREATE INDEX IF NOT EXISTS idx_relics_rarity ON relics(rarity);
CREATE INDEX IF NOT EXISTS idx_explorations_player ON explorations(player_id);
CREATE INDEX IF NOT EXISTS idx_explorations_status ON explorations(status);
CREATE INDEX IF NOT EXISTS idx_market_listings_status ON market_listings(status);
CREATE INDEX IF NOT EXISTS idx_announcements_player ON announcements(player_id);
CREATE INDEX IF NOT EXISTS idx_team_members_player ON team_members(player_id);
CREATE INDEX IF NOT EXISTS idx_materials_player ON materials(player_id);
