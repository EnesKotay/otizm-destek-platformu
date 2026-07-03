package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CommunityMeetupDto {
    private UUID id;

    @NotBlank(message = "Buluşma başlığı zorunludur")
    private String title;

    @NotBlank(message = "Şehir zorunludur")
    private String city;

    private String district;
    private String venue;

    @NotNull(message = "Tarih zorunludur")
    private LocalDate date;

    private LocalTime time;
    private String description;
    private String organizer;
    private int attendees;
    private boolean joined;
    private String emoji;
    private LocalDateTime createdAt;
}
