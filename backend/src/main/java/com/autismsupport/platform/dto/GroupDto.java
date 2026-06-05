package com.autismsupport.platform.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GroupDto {
    private UUID id;

    @NotBlank(message = "Grup adi zorunludur")
    private String name;

    private String description;
    private String category;
    private boolean verified;
    private String avatarUrl;
    private int memberCount;

    @JsonProperty("isMember")
    private boolean isMember;
    private UUID conversationId;
    private int expertCount;
    private UUID createdByUserId;
    private LocalDateTime createdAt;
}
