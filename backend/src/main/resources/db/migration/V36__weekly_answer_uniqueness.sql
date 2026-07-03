ALTER TABLE weekly_answers
    ADD CONSTRAINT uk_weekly_answers_question_author UNIQUE (question_id, author_id);
