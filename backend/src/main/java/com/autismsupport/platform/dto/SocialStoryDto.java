package com.autismsupport.platform.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor @Builder
public class SocialStoryDto {
    private UUID id;
    private UUID authorId;
    private String authorName;
    @NotBlank
    @Size(max = 200, message = "Başlık en fazla 200 karakter olabilir")
    private String title;
    private String category;
    @Size(max = 500, message = "Açıklama en fazla 500 karakter olabilir")
    private String description;
    private List<Map<String, Object>> pages;
    @JsonProperty("isPublic")
    private boolean isPublic;
    private UUID childId;
    private int viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
