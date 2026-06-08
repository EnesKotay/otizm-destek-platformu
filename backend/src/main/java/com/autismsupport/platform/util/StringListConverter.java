package com.autismsupport.platform.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;
import java.util.List;

@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

    private static final String SEPARATOR = "|||";

    @Override
    public String convertToDatabaseColumn(List<String> list) {
        if (list == null || list.isEmpty()) return null;
        return String.join(SEPARATOR, list);
    }

    @Override
    public List<String> convertToEntityAttribute(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.asList(s.split("\\|\\|\\|"));
    }
}
