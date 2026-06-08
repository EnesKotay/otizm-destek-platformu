package com.autismsupport.platform.service;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class HtmlSanitizer {

    private static final Set<String> ALLOWED_TAGS = Set.of("p", "br", "ul", "ol", "li", "strong", "b", "em", "i");
    private static final Pattern TAG_PATTERN = Pattern.compile("<(/?)([a-zA-Z0-9]+)([^>]*)>");
    private static final Pattern DANGEROUS_BLOCKS = Pattern.compile("(?is)<(script|style|iframe|object|embed|link|meta)[^>]*>.*?</\\1>");

    public String sanitize(String value) {
        if (value == null) return null;
        String withoutBlocks = DANGEROUS_BLOCKS.matcher(value).replaceAll("");
        String escaped = escapeNonAllowedTags(withoutBlocks);
        return escaped.trim();
    }

    private String escapeNonAllowedTags(String value) {
        Matcher matcher = TAG_PATTERN.matcher(value);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String slash = matcher.group(1);
            String tag = matcher.group(2).toLowerCase(Locale.ROOT);
            if (ALLOWED_TAGS.contains(tag)) {
                String safeTag = "<" + slash + tag + (slash.isEmpty() && "br".equals(tag) ? " /" : "") + ">";
                matcher.appendReplacement(result, Matcher.quoteReplacement(safeTag));
            } else {
                matcher.appendReplacement(result, Matcher.quoteReplacement(escapeHtml(matcher.group())));
            }
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
