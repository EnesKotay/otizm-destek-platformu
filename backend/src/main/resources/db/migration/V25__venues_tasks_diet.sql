-- Sensory-friendly venue haritası
CREATE TABLE IF NOT EXISTS venues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    description     TEXT,
    address         VARCHAR(500),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    avg_noise_level DOUBLE PRECISION,
    avg_light_level DOUBLE PRECISION,
    avg_crowd_level DOUBLE PRECISION,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- Venue değerlendirmeleri (duyusal skorlar)
CREATE TABLE IF NOT EXISTS venue_reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    noise_level INT,
    light_level INT,
    crowd_level INT,
    comments    TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_reviews_venue_id ON venue_reviews(venue_id);

-- Uzman tarafından aileye atanan görevler
CREATE TABLE IF NOT EXISTS expert_tasks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id     UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    category     VARCHAR(100),
    difficulty   VARCHAR(50),
    frequency    VARCHAR(50),
    material_url VARCHAR(500),
    due_date     DATE,
    status       VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expert_tasks_parent_id  ON expert_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_expert_tasks_expert_id  ON expert_tasks(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_tasks_child_id   ON expert_tasks(child_id);

-- Ebeveynin göreve verdiği yanıtlar / kanıtlar
CREATE TABLE IF NOT EXISTS task_submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES expert_tasks(id) ON DELETE CASCADE,
    parent_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_note     TEXT,
    evidence_url    VARCHAR(500),
    expert_feedback TEXT,
    expert_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON task_submissions(task_id);

-- Çocuğa özel diyet tercihleri
CREATE TABLE IF NOT EXISTS diet_preferences (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id     UUID NOT NULL UNIQUE REFERENCES children(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gfcf_diet    BOOLEAN NOT NULL DEFAULT FALSE,
    sugar_free   BOOLEAN NOT NULL DEFAULT FALSE,
    dairy_free   BOOLEAN NOT NULL DEFAULT FALSE,
    gluten_free  BOOLEAN NOT NULL DEFAULT FALSE,
    soy_free     BOOLEAN NOT NULL DEFAULT FALSE,
    egg_free     BOOLEAN NOT NULL DEFAULT FALSE,
    other_diet   VARCHAR(255),
    notes        TEXT,
    updated_at   TIMESTAMP NOT NULL DEFAULT now()
);
