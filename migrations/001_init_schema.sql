CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    level INT DEFAULT 1,
    exp INT DEFAULT 0,
    gold BIGINT DEFAULT 0,
    gems INT DEFAULT 0,
    total_relic_value BIGINT DEFAULT 0,
    museum_score INT DEFAULT 0,
    is_committee BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    profession VARCHAR(50) NOT NULL,
    skill_level INT NOT NULL,
    luck INT NOT NULL,
    rarity VARCHAR(50) NOT NULL,
    avatar VARCHAR(255),
    skills JSONB DEFAULT '{}',
    description TEXT,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    is_recruited BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    member_ids UUID[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ruins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    civilization VARCHAR(100) NOT NULL,
    difficulty INT NOT NULL,
    description TEXT,
    image VARCHAR(255),
    min_level INT DEFAULT 1,
    estimated_time INT,
    potential_relics TEXT[] DEFAULT '{}',
    event_pool TEXT[] DEFAULT '{}',
    rewards JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS explorations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    ruin_id UUID REFERENCES ruins(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    progress FLOAT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'exploring',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    events_triggered JSONB DEFAULT '[]',
    relics_found UUID[] DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    civilization VARCHAR(100) NOT NULL,
    completeness INT DEFAULT 0,
    rarity VARCHAR(50) NOT NULL,
    historical_value INT DEFAULT 0,
    estimated_price BIGINT DEFAULT 0,
    description TEXT,
    image VARCHAR(255),
    fragments INT DEFAULT 0,
    discovered_at TIMESTAMP,
    repair_history JSONB DEFAULT '[]',
    in_museum BOOLEAN DEFAULT false,
    on_market BOOLEAN DEFAULT false,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS museums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE UNIQUE,
    name VARCHAR(255) NOT NULL,
    level INT DEFAULT 1,
    attractiveness INT DEFAULT 0,
    daily_income BIGINT DEFAULT 0,
    total_visitors BIGINT DEFAULT 0,
    halls JSONB DEFAULT '[]',
    layout JSONB DEFAULT '[]',
    income_history JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relic_id UUID REFERENCES relics(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES players(id) ON DELETE CASCADE,
    seller_name VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
    suggested_price_min BIGINT,
    suggested_price_max BIGINT,
    status VARCHAR(50) DEFAULT 'pending_approval',
    create_time TIMESTAMP,
    approvals JSONB DEFAULT '[]',
    price_history JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rank_type VARCHAR(100) NOT NULL,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    player_name VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    value BIGINT NOT NULL,
    change INT DEFAULT 0,
    week INT,
    year INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS secret_realms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    civilization VARCHAR(100),
    open_time TIMESTAMP,
    close_time TIMESTAMP,
    max_players INT,
    current_players INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    teams JSONB DEFAULT '[]',
    global_events JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    rarity VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    quality INT NOT NULL,
    amount INT DEFAULT 0,
    icon VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ruins_updated_at BEFORE UPDATE ON ruins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_explorations_updated_at BEFORE UPDATE ON explorations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_relics_updated_at BEFORE UPDATE ON relics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_museums_updated_at BEFORE UPDATE ON museums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_market_listings_updated_at BEFORE UPDATE ON market_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rankings_updated_at BEFORE UPDATE ON rankings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_secret_realms_updated_at BEFORE UPDATE ON secret_realms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
