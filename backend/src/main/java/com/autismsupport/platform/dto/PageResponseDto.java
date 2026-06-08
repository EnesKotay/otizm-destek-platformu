package com.autismsupport.platform.dto;

import lombok.Builder;
import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

@Getter
@Builder
public class PageResponseDto<T> {
    private final List<T> content;
    private final int totalPages;
    private final long totalElements;
    private final int number;
    private final int size;
    private final boolean first;
    private final boolean last;
    private final boolean empty;

    public static <T> PageResponseDto<T> from(Page<T> page) {
        return PageResponseDto.<T>builder()
                .content(page.getContent())
                .totalPages(page.getTotalPages())
                .totalElements(page.getTotalElements())
                .number(page.getNumber())
                .size(page.getSize())
                .first(page.isFirst())
                .last(page.isLast())
                .empty(page.isEmpty())
                .build();
    }
}
