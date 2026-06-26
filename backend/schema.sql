-- Schema for Real-Time Task Board

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'done'
  position DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
