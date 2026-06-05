package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ForumPostDto {
    private UUID id;

    @NotBlank(message = "Baslik zorunludur")
    private String title;

    @NotBlank(message = "Icerik zorunludur")
    private String content;

    private String category;
    private String postType;
    private boolean pinned;
    private boolean featured;
    private boolean answered;
    private boolean anonymous;
    private UUID acceptedAnswerId;
    private int likeCount;
    private int commentCount;
    private Map<String, Object> privacySettings;
    private List<TagDto> tags;
    private Set<UUID> tagIds;
    private boolean likedByMe;
    private UserDto author;
    private LocalDateTime createdAt;
}
