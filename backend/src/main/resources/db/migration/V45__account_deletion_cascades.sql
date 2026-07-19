DO $$
DECLARE
    constraint_row RECORD;
    definition TEXT;
BEGIN
    FOR constraint_row IN
        SELECT c.oid, c.conname, c.conrelid::regclass AS table_name
        FROM pg_constraint c
        WHERE c.contype = 'f'
          AND c.confrelid = 'users'::regclass
          AND c.confdeltype = 'a'
    LOOP
        definition := pg_get_constraintdef(constraint_row.oid) || ' ON DELETE CASCADE';
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', constraint_row.table_name, constraint_row.conname);
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', constraint_row.table_name, constraint_row.conname, definition);
    END LOOP;
END $$;
