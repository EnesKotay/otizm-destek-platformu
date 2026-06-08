package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "calendar_events", indexes = {
        @Index(name = "idx_calendar_child_start", columnList = "child_id, start_time")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    private Child child;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "recurrence_rule")
    private String recurrenceRule;

    // Etkinlik durumu: PLANNED / COMPLETED / CANCELLED
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PLANNED";

    // Etkinlik konumu (klinik adı, adres vb.)
    @Column(length = 255)
    private String location;

    // Etkinlikten kaç dakika önce hatırlatma (null = kapalı)
    @Column(name = "reminder_minutes_before")
    private Integer reminderMinutesBefore;

    // Hatırlatma bildirimi gönderildi mi?
    @Column(name = "reminder_sent", nullable = false)
    @Builder.Default
    private boolean reminderSent = false;

    @Column(name = "reminder_minutes_before")
    @Builder.Default
    private Integer reminderMinutesBefore = 60;

    @Column(name = "location")
    private String location;

    @Column(name = "reminder_sent")
    @Builder.Default
    private boolean reminderSent = false;

    @Builder.Default
    private String status = "PLANNED";

    @Builder.Default
    private String color = "#4F46E5";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
