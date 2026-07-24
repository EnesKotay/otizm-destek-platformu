package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentDto {
    private UUID id;
    private UUID expertId;
    private String expertName;
    private String expertTitle;
    private UUID parentId;
    private String parentName;
    private UUID childId;
    private String childName;

    @NotNull(message = "Tarih zorunludur")
    private LocalDate date;

    @NotBlank(message = "Saat zorunludur")
    private String time;

    @Builder.Default
    private int duration = 50;

    @NotBlank(message = "Randevu tipi zorunludur")
    private String type;

    private String status;
    private String notes;
    private String sessionNotes;
    private String sessionSummary;
    private String followUpRecommendations;
    private String followUpTask;
    private String appointmentTopic;
    private String preSessionNotes;
    private String cancellationReason;
    private String meetingLink;
    private UUID calendarEventId;
    private LocalDateTime createdAt;
    private Integer rating;
    private String ratingComment;

    // Tekrarlayan randevu alanları
    private UUID recurringGroupId;
    private Integer recurrenceIndex;
    private Integer recurrenceWeeks; // sadece oluştururken kullanılır
    private List<String> skippedWeeks; // oluşturma yanıtında atlanan haftalar

    // İptal detayları
    private boolean lateCancellation;
    private String cancellationBy; // PARENT | EXPERT | SYSTEM
}
