CREATE TABLE IF NOT EXISTS weekly_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    tag VARCHAR(80),
    week_label VARCHAR(80),
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE weekly_questions ADD COLUMN IF NOT EXISTS week_label VARCHAR(80);

CREATE TABLE IF NOT EXISTS weekly_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES weekly_questions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    like_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_answer_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_id UUID NOT NULL REFERENCES weekly_answers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_weekly_answer_likes_answer_user UNIQUE (answer_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_meetups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    city VARCHAR(120) NOT NULL,
    district VARCHAR(120),
    venue VARCHAR(255),
    meetup_date DATE NOT NULL,
    meetup_time TIME,
    description TEXT,
    emoji VARCHAR(16),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_meetup_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meetup_id UUID NOT NULL REFERENCES community_meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_community_meetup_attendees_meetup_user UNIQUE (meetup_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_answers_question ON weekly_answers(question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_meetups_date ON community_meetups(meetup_date, meetup_time);
CREATE INDEX IF NOT EXISTS idx_community_meetups_city_date ON community_meetups(city, meetup_date);

INSERT INTO weekly_questions (question, tag, week_label, sort_order, active)
SELECT 'Çocuğunuzla en çok hangi aktiviteyi yapıyorsunuz ve neden işe yarıyor?', '#günlük', 'Bu Hafta', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM weekly_questions WHERE sort_order = 1);

INSERT INTO weekly_questions (question, tag, week_label, sort_order, active)
SELECT 'Çocuğunuzu okula ya da terapiye hazırlarken ne yapıyorsunuz?', '#okul', 'Geçen Hafta', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM weekly_questions WHERE sort_order = 2);

INSERT INTO weekly_questions (question, tag, week_label, sort_order, active)
SELECT 'Duyusal bunalma anında çocuğunuzu sakinleştirmek için ne yapıyorsunuz?', '#duyusal', '2 Hafta Önce', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM weekly_questions WHERE sort_order = 3);
