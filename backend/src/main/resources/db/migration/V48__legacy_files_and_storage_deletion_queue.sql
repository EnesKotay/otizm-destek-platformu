CREATE TABLE IF NOT EXISTS storage_deletion_queue (
    filename VARCHAR(255) PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO stored_files(filename, owner_id, original_filename, content_type, size, visibility, created_at)
SELECT filename, id, filename,
       CASE
           WHEN lower(filename) ~ '\.(jpg|jpeg)$' THEN 'image/jpeg'
           WHEN lower(filename) ~ '\.png$' THEN 'image/png'
           WHEN lower(filename) ~ '\.webp$' THEN 'image/webp'
           WHEN lower(filename) ~ '\.gif$' THEN 'image/gif'
           WHEN lower(filename) ~ '\.pdf$' THEN 'application/pdf'
           ELSE 'text/plain'
       END,
       0, 'AUTHENTICATED', CURRENT_TIMESTAMP
FROM (
    SELECT id, regexp_replace(profile_image_url, '^.*/', '') AS filename
    FROM users
    WHERE profile_image_url LIKE '/api/upload/%'
) legacy_users
ON CONFLICT (filename) DO NOTHING;

INSERT INTO stored_files(filename, owner_id, original_filename, content_type, size, visibility, scope_type, scope_id, created_at)
SELECT filename, parent_id, filename,
       CASE
           WHEN lower(filename) ~ '\.(jpg|jpeg)$' THEN 'image/jpeg'
           WHEN lower(filename) ~ '\.png$' THEN 'image/png'
           WHEN lower(filename) ~ '\.webp$' THEN 'image/webp'
           WHEN lower(filename) ~ '\.gif$' THEN 'image/gif'
           ELSE 'application/octet-stream'
       END,
       0, 'PRIVATE', 'CHILD_PROFILE', id, CURRENT_TIMESTAMP
FROM (
    SELECT id, parent_id, regexp_replace(profile_image_url, '^.*/', '') AS filename
    FROM children
    WHERE profile_image_url LIKE '/api/upload/%'
) legacy_children
ON CONFLICT (filename) DO NOTHING;

INSERT INTO stored_files(filename, owner_id, original_filename, content_type, size, visibility, scope_type, scope_id, created_at)
SELECT filename, sender_id, filename,
       CASE
           WHEN lower(filename) ~ '\.(jpg|jpeg)$' THEN 'image/jpeg'
           WHEN lower(filename) ~ '\.png$' THEN 'image/png'
           WHEN lower(filename) ~ '\.webp$' THEN 'image/webp'
           WHEN lower(filename) ~ '\.gif$' THEN 'image/gif'
           WHEN lower(filename) ~ '\.pdf$' THEN 'application/pdf'
           ELSE 'text/plain'
       END,
       0, 'PRIVATE', 'CONVERSATION', conversation_id, CURRENT_TIMESTAMP
FROM (
    SELECT sender_id, conversation_id, regexp_replace(file_url, '^.*/', '') AS filename
    FROM messages
    WHERE file_url LIKE '/api/upload/%'
) legacy_messages
ON CONFLICT (filename) DO NOTHING;
