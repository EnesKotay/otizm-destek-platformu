ALTER TABLE users ADD COLUMN consent_ai_analysis BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN consent_ai_analysis_date TIMESTAMP;
ALTER TABLE users ADD COLUMN consent_emergency_card BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN consent_emergency_card_date TIMESTAMP;
