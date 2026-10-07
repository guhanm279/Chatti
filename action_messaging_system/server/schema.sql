-- CHATTi Core Schema for Aiven PostgreSQL

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  avatar VARCHAR(256),
  role VARCHAR(64),
  status VARCHAR(32) DEFAULT 'online',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(32) DEFAULT 'group',
  badge VARCHAR(64) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id VARCHAR(64) REFERENCES conversations(id) ON DELETE CASCADE,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(32) DEFAULT 'text', -- 'text', 'whisper', 'task', 'fuse'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64) REFERENCES messages(id) ON DELETE SET NULL,
  assigned_to VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(256) NOT NULL,
  description TEXT DEFAULT '',
  deadline VARCHAR(128),
  status VARCHAR(32) DEFAULT 'pending', -- 'pending', 'completed'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuses (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64) REFERENCES messages(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  option_a VARCHAR(128) DEFAULT '👍 Submit Today',
  option_b VARCHAR(128) DEFAULT '👎 Tomorrow',
  duration_seconds INT DEFAULT 10,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) DEFAULT 'active', -- 'active', 'locked'
  outcome VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
  id VARCHAR(64) PRIMARY KEY,
  fuse_id VARCHAR(64) REFERENCES fuses(id) ON DELETE CASCADE,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  vote VARCHAR(64) NOT NULL, -- 'option_a' or 'option_b'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fuse_id, user_id)
);

CREATE TABLE IF NOT EXISTS whispers (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64) REFERENCES messages(id) ON DELETE SET NULL,
  sender_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  recipient_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL, -- 'whisper', 'task', 'fuse', 'vote', 'decision_locked'
  title TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
