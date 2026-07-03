package com.autismsupport.platform.dto;

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
public class WeeklyAnswerDto {
    private UUID id;
    private String author;
    private String city;

    @NotBlank(message = "Cevap zorunludur")
    private String text;

    private int likes;
    private boolean liked;
    private LocalDateTime createdAt;
}
