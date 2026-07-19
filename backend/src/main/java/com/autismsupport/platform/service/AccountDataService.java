package com.autismsupport.platform.service;

import com.autismsupport.platform.security.EncryptedStringConverter;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.*;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AccountDataService {
    private static final Set<String> EXCLUDED_TABLES = Set.of(
            "flyway_schema_history", "refresh_tokens", "password_reset_tokens", "device_tokens", "push_subscriptions"
    );
    private static final Set<String> SECRET_COLUMNS = Set.of(
            "password_hash", "token", "secret", "endpoint", "p256dh", "auth"
    );

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final EncryptedStringConverter encryptedStringConverter = new EncryptedStringConverter();

    @Transactional(readOnly = true)
    public Map<String, Object> exportFor(UUID userId) {
        try (Connection connection = dataSource.getConnection()) {
            String schema = connection.getSchema();
            String quote = connection.getMetaData().getIdentifierQuoteString().trim();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("exportedAt", Instant.now().toString());
            result.put("formatVersion", 1);

            Set<UUID> childIds = queryIds("SELECT id FROM children WHERE parent_id = ?", userId);
            Set<UUID> conversationIds = findConversationIds(connection, schema, quote, userId);
            Map<String, List<Map<String, Object>>> tables = new TreeMap<>();

            try (ResultSet rs = connection.getMetaData().getTables(connection.getCatalog(), schema, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    String table = rs.getString("TABLE_NAME");
                    if (table == null || EXCLUDED_TABLES.contains(table.toLowerCase(Locale.ROOT))) continue;
                    List<String> columns = columns(connection, schema, table);
                    List<String> conditions = new ArrayList<>();
                    List<Object> args = new ArrayList<>();

                    if ("users".equalsIgnoreCase(table) && containsIgnoreCase(columns, "id")) {
                        conditions.add(q(quote, "id") + " = ?");
                        args.add(userId);
                    }
                    for (String column : columns) {
                        String lower = column.toLowerCase(Locale.ROOT);
                        if ((lower.endsWith("_id") || lower.equals("created_by") || lower.equals("changed_by"))
                                && !lower.equals("child_id") && !lower.equals("conversation_id")) {
                            conditions.add(q(quote, column) + " = ?");
                            args.add(userId);
                        }
                        if (lower.equals("child_id")) {
                            for (UUID childId : childIds) {
                                conditions.add(q(quote, column) + " = ?");
                                args.add(childId);
                            }
                        }
                        if (lower.equals("conversation_id")) {
                            for (UUID conversationId : conversationIds) {
                                conditions.add(q(quote, column) + " = ?");
                                args.add(conversationId);
                            }
                        }
                    }
                    if (conditions.isEmpty()) continue;
                    String sql = "SELECT * FROM " + q(quote, table) + " WHERE " + String.join(" OR ", conditions);
                    List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, args.toArray()).stream()
                            .map(this::sanitizeRow)
                            .toList();
                    if (!rows.isEmpty()) tables.put(table, rows);
                }
            }
            result.put("tables", tables);
            return result;
        } catch (SQLException e) {
            throw new IllegalStateException("Kişisel veri arşivi oluşturulamadı", e);
        }
    }

    private Set<UUID> findConversationIds(Connection connection, String schema, String quote, UUID userId) throws SQLException {
        if (!tableExists(connection, schema, "conversations")) return Set.of();
        List<String> cols = columns(connection, schema, "conversations");
        List<String> participantCols = cols.stream()
                .filter(c -> c.toLowerCase(Locale.ROOT).contains("participant") && c.toLowerCase(Locale.ROOT).endsWith("_id"))
                .toList();
        if (participantCols.isEmpty()) return Set.of();
        String where = participantCols.stream().map(c -> q(quote, c) + " = ?").reduce((a, b) -> a + " OR " + b).orElseThrow();
        return queryIds("SELECT id FROM " + q(quote, "conversations") + " WHERE " + where,
                java.util.Collections.nCopies(participantCols.size(), userId).toArray());
    }

    private Set<UUID> queryIds(String sql, Object... args) {
        return new LinkedHashSet<>(jdbcTemplate.query(sql, (rs, row) -> rs.getObject(1, UUID.class), args));
    }

    private List<String> columns(Connection connection, String schema, String table) throws SQLException {
        List<String> result = new ArrayList<>();
        try (ResultSet rs = connection.getMetaData().getColumns(connection.getCatalog(), schema, table, "%")) {
            while (rs.next()) result.add(rs.getString("COLUMN_NAME"));
        }
        return result;
    }

    private boolean tableExists(Connection connection, String schema, String table) throws SQLException {
        try (ResultSet rs = connection.getMetaData().getTables(connection.getCatalog(), schema, table, new String[]{"TABLE"})) {
            return rs.next();
        }
    }

    private Map<String, Object> sanitizeRow(Map<String, Object> row) {
        Map<String, Object> clean = new LinkedHashMap<>();
        row.forEach((key, value) -> {
            if (!SECRET_COLUMNS.contains(key.toLowerCase(Locale.ROOT))) clean.put(key, readable(value));
        });
        return clean;
    }

    private Object readable(Object value) {
        if (!(value instanceof String text) || !text.startsWith("enc:v1:")) return value;
        String decrypted = encryptedStringConverter.convertToEntityAttribute(text);
        try {
            if (decrypted.startsWith("{") || decrypted.startsWith("[")) return objectMapper.readValue(decrypted, Object.class);
        } catch (Exception ignored) { }
        return decrypted;
    }

    private boolean containsIgnoreCase(List<String> values, String wanted) {
        return values.stream().anyMatch(wanted::equalsIgnoreCase);
    }

    private String q(String quote, String identifier) {
        return quote.isEmpty() ? identifier : quote + identifier.replace(quote, quote + quote) + quote;
    }
}
