CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);

CREATE INDEX IF NOT EXISTS idx_relics_player_id ON relics(player_id);
CREATE INDEX IF NOT EXISTS idx_relics_rarity ON relics(rarity);
CREATE INDEX IF NOT EXISTS idx_relics_civilization ON relics(civilization);
CREATE INDEX IF NOT EXISTS idx_relics_player_rarity ON relics(player_id, rarity);
CREATE INDEX IF NOT EXISTS idx_relics_player_civilization ON relics(player_id, civilization);

CREATE INDEX IF NOT EXISTS idx_explorations_player_id ON explorations(player_id);
CREATE INDEX IF NOT EXISTS idx_explorations_status ON explorations(status);
CREATE INDEX IF NOT EXISTS idx_explorations_player_status ON explorations(player_id, status);

CREATE INDEX IF NOT EXISTS idx_market_listings_status ON market_listings(status);
CREATE INDEX IF NOT EXISTS idx_market_listings_price ON market_listings(price);
CREATE INDEX IF NOT EXISTS idx_market_listings_status_price ON market_listings(status, price);

CREATE INDEX IF NOT EXISTS idx_team_members_player_id ON team_members(player_id);
CREATE INDEX IF NOT EXISTS idx_teams_player_id ON teams(player_id);
CREATE INDEX IF NOT EXISTS idx_rankings_rank_type ON rankings(rank_type);
CREATE INDEX IF NOT EXISTS idx_rankings_player_id ON rankings(player_id);
CREATE INDEX IF NOT EXISTS idx_materials_player_id ON materials(player_id);
CREATE INDEX IF NOT EXISTS idx_exploration_event_templates_template_id ON exploration_event_templates(template_id);
