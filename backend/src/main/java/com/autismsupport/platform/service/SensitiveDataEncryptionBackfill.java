package com.autismsupport.platform.service;

import com.autismsupport.platform.security.EncryptedStringConverter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class SensitiveDataEncryptionBackfill {
    private static final List<Column> COLUMNS = List.of(
            new Column("children", "diagnosis_info"), new Column("children", "education_program"),
            new Column("children", "therapies"), new Column("abc_entries", "antecedent"),
            new Column("abc_entries", "behavior"), new Column("abc_entries", "consequence"),
            new Column("abc_entries", "notes"), new Column("development_notes", "title"),
            new Column("development_notes", "content"), new Column("sensory_profiles", "domains"),
            new Column("patient_notes", "content"), new Column("medication_logs", "notes"),
            new Column("messages", "content"), new Column("screening_results", "answers"),
            new Column("bep_reports", "student_name"), new Column("bep_reports", "diagnosis"),
            new Column("bep_reports", "performance"), new Column("bep_reports", "goals")
    );

    private final JdbcTemplate jdbcTemplate;
    private final boolean enabled;
    private final EncryptedStringConverter converter = new EncryptedStringConverter();

    public SensitiveDataEncryptionBackfill(JdbcTemplate jdbcTemplate,
            @Value("${app.encryption.backfill-enabled:true}") boolean enabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.enabled = enabled;
    }

    @Scheduled(initialDelay = 30_000, fixedDelay = 60_000)
    public void encryptLegacyRows() {
        if (!enabled) return;
        int updated = 0;
        for (Column target : COLUMNS) {
            String select = "SELECT id, " + target.name + " AS value FROM " + target.table
                    + " WHERE " + target.name + " IS NOT NULL AND " + target.name
                    + " NOT LIKE 'enc:v1:%' FETCH FIRST 100 ROWS ONLY";
            try {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList(select);
                for (Map<String, Object> row : rows) {
                    Object value = row.get("value");
                    if (value == null) continue;
                    updated += jdbcTemplate.update("UPDATE " + target.table + " SET " + target.name + " = ? WHERE id = ?",
                            converter.convertToDatabaseColumn(value.toString()), row.get("id"));
                }
            } catch (Exception e) {
                log.warn("Hassas veri backfill sütunu işlenemedi; table={}, column={}, type={}",
                        target.table, target.name, e.getClass().getSimpleName());
            }
        }
        if (updated > 0) log.info("Hassas veri backfill turunda {} alan şifrelendi", updated);
    }

    private record Column(String table, String name) { }
}
