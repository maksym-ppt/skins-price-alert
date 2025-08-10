-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  preferences JSONB DEFAULT '{"currency": "USD", "language": "en", "notifications": true}',
  limits JSONB DEFAULT '{"max_alerts": 5, "price_checks_per_minute": 10, "tier": "free"}',
  usage JSONB DEFAULT '{"alerts_created": 0, "price_checks_this_minute": 0}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CS2 Items table for storing all items from CSV files
CREATE TABLE items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(500) NOT NULL UNIQUE,
  weapon_name VARCHAR(255) NOT NULL,
  weapon_type VARCHAR(100) NOT NULL,
  skin_name VARCHAR(255),
  rarity VARCHAR(100) NOT NULL,
  rarity_definition VARCHAR(100),
  rarity_color VARCHAR(50),
  collection VARCHAR(500),
  introduced_date DATE,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(name, '') || ' ' || 
      COALESCE(weapon_name, '') || ' ' || 
      COALESCE(skin_name, '') || ' ' || 
      COALESCE(collection, '')
    )
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price alerts table
CREATE TABLE price_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(500) NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  game_id INTEGER DEFAULT 730, -- Default to CS2
  currency_id INTEGER DEFAULT 1, -- Default to USD
  target_price DECIMAL(10,2) NOT NULL,
  current_price DECIMAL(10,2),
  alert_type VARCHAR(20) DEFAULT 'absolute' CHECK (alert_type IN ('absolute', 'percentage_drop', 'percentage_increase')),
  percentage_threshold DECIMAL(5,2), -- For percentage alerts (e.g., 10.5 for 10.5%)
  base_price DECIMAL(10,2), -- Base price for percentage calculations
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price cache table
CREATE TABLE price_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_name VARCHAR(500) NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  game_id INTEGER DEFAULT 730, -- Default to CS2
  currency_id INTEGER DEFAULT 1, -- Default to USD
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  volume INTEGER,
  median_price DECIMAL(10,2),
  success BOOLEAN DEFAULT true,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Price history table
CREATE TABLE price_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_name VARCHAR(500) NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  game_id INTEGER DEFAULT 730, -- Default to CS2
  currency_id INTEGER DEFAULT 1, -- Default to USD
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  volume INTEGER,
  median_price DECIMAL(10,2),
  success BOOLEAN DEFAULT true,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_items_weapon_name ON items(weapon_name);
CREATE INDEX idx_items_weapon_type ON items(weapon_type);
CREATE INDEX idx_items_rarity ON items(rarity);
CREATE INDEX idx_items_collection ON items(collection);
CREATE INDEX idx_items_search_vector ON items USING GIN(search_vector);
CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_item_id ON price_alerts(item_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active);
CREATE INDEX idx_price_cache_item_name ON price_cache(item_name);
CREATE INDEX idx_price_cache_item_id ON price_cache(item_id);
CREATE INDEX idx_price_cache_expires ON price_cache(expires_at);
CREATE INDEX idx_price_history_item_name ON price_history(item_name);
CREATE INDEX idx_price_history_item_id ON price_history(item_id);
CREATE INDEX idx_price_history_recorded ON price_history(recorded_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON price_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Public access policies for server-side usage without Supabase Auth
CREATE POLICY "Public can view users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Public can insert users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update users" ON users
  FOR UPDATE USING (true);

-- Items are publicly readable for search functionality
CREATE POLICY "Public can view items" ON items
  FOR SELECT USING (true);

CREATE POLICY "Public can insert items" ON items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update items" ON items
  FOR UPDATE USING (true);

-- Price alerts policies
CREATE POLICY "Users can view own alerts" ON price_alerts
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own alerts" ON price_alerts
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own alerts" ON price_alerts
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = auth.uid()::text
    )
  );

-- Public access for server-side operations
CREATE POLICY "Public can view price_alerts" ON price_alerts
  FOR SELECT USING (true);

CREATE POLICY "Public can insert price_alerts" ON price_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update price_alerts" ON price_alerts
  FOR UPDATE USING (true);
