ALTER TABLE forum_posts
    ADD COLUMN IF NOT EXISTS question_context JSONB;

CREATE TABLE IF NOT EXISTS forum_answer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('WORKED', 'PARTIAL', 'NOT_WORKED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_forum_answer_feedback_user UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_answer_feedback_comment
    ON forum_answer_feedback(comment_id);

