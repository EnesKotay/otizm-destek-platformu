package com.autismsupport.platform.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import jakarta.persistence.PersistenceException;

import java.util.List;
import java.util.Map;

@Converter
public class EncryptedGoalsConverter implements AttributeConverter<List<Map<String, Object>>, String> {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final EncryptedStringConverter crypto = new EncryptedStringConverter();

    public String convertToDatabaseColumn(List<Map<String, Object>> value) {
        if (value == null) return null;
        try { return crypto.convertToDatabaseColumn(JSON.writeValueAsString(value)); }
        catch (Exception e) { throw new PersistenceException("BEP hedefleri şifrelenemedi", e); }
    }

    public List<Map<String, Object>> convertToEntityAttribute(String value) {
        if (value == null) return List.of();
        try {
            String decrypted = crypto.convertToEntityAttribute(value);
            if (decrypted == null || decrypted.startsWith("enc:v1:")) return List.of();
            return JSON.readValue(decrypted, new TypeReference<>() {});
        } catch (Exception e) { return List.of(); }
    }
}
