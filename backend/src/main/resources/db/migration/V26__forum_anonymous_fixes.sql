ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS is_expert_approved BOOLEAN DEFAULT false;
