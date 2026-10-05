package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class WeeklyAnswerDto {
    private UUID id;
    private String author;
    private String city;
    private String authorRole;
    private String expertTitle;
    private boolean anonymous;
    private boolean hideCity;
    private boolean own;
    private List<String> tags;

    @NotBlank(message = "Cevap zorunludur")
    private String text;

    private int likes;
    private boolean liked;
    private LocalDateTime createdAt;
}
