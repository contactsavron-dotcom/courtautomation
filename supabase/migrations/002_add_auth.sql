ALTER TABLE advocates ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_advocates_auth_user_id ON advocates(auth_user_id);
