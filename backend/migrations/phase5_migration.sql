-- Phase V Database Migration
-- Per specs/phase5/data-model.md

-- ============================================================================
-- Extend tasks table with Phase V fields
-- ============================================================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium' NOT NULL,
ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(is_completed);

-- ============================================================================
-- Create reminders table
-- ============================================================================

CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remind_at TIMESTAMP NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(sent, remind_at);

-- ============================================================================
-- Create tags table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tags_user_name UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- ============================================================================
-- Create task_tags join table
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_tags (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_task_tags_unique UNIQUE(task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- ============================================================================
-- Create processed_events table (for idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS processed_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    service_name VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_processed_events_unique UNIQUE(event_id, service_name)
);

CREATE INDEX IF NOT EXISTS idx_processed_events_event_id ON processed_events(event_id);

-- ============================================================================
-- Verify migration
-- ============================================================================

-- Check that all tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reminders') THEN
        RAISE EXCEPTION 'Migration failed: reminders table not created';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tags') THEN
        RAISE EXCEPTION 'Migration failed: tags table not created';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_tags') THEN
        RAISE EXCEPTION 'Migration failed: task_tags table not created';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'processed_events') THEN
        RAISE EXCEPTION 'Migration failed: processed_events table not created';
    END IF;
    RAISE NOTICE 'Phase V migration completed successfully!';
END $$;
