-- X4Kiss PostgreSQL baseline for the Cloudflare D1 replacement.
-- Apply only to the new, empty Neon project. This does not copy production user data.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  full_name TEXT,
  age_confirmed_at TEXT,
  terms_accepted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  mfa_verified_at TEXT,
  reauthenticated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS super_admin_mfa (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_ciphertext TEXT NOT NULL,
  secret_iv TEXT NOT NULL,
  enabled_at TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_verified_step BIGINT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_security_audit (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target TEXT,
  outcome TEXT NOT NULL,
  reason TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_security_audit_created_at ON admin_security_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_security_audit_actor ON admin_security_audit(actor_user_id, created_at);

CREATE TABLE IF NOT EXISTS creator_videos (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  download_policy TEXT NOT NULL DEFAULT 'disabled',
  status TEXT NOT NULL DEFAULT 'uploading',
  storage TEXT NOT NULL DEFAULT 'ElasticLake',
  created_at TEXT NOT NULL
);
