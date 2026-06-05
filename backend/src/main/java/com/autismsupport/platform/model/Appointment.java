package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "appointments", indexes = {
        @Index(name = "idx_appointments_expert_date",  columnList = "expert_id, appointment_date"),
        @Index(name = "idx_appointments_parent_date",  columnList = "parent_id, appointment_date"),
        @Index(name = "idx_appointments_child_date",   columnList = "child_id, appointment_date"),
        @Index(name = "idx_appointments_status",       columnList = "status")
})
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expert_id", nullable = false)
    private User expert;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private User parent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id")
    private Child child;

    @Column(name = "appointment_date", nullable = false)
    private LocalDate appointmentDate;

    @Column(name = "appointment_time", nullable = false)
    private LocalTime appointmentTime;

    @Column(nullable = false)
    @Builder.Default
    private Integer duration = 50;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String type = "FACE_TO_FACE";

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING";

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "session_notes", columnDefinition = "TEXT")
    private String sessionNotes;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "cancellation_by", length = 20)
    private String cancellationBy; // PARENT | EXPERT | SYSTEM

    @Column(name = "late_cancellation", nullable = false)
    @Builder.Default
    private boolean lateCancellation = false;

    @Column(name = "meeting_link", length = 500)
    private String meetingLink;

    @Column(name = "calendar_event_id")
    private UUID calendarEventId;

    private Integer rating;

    @Column(name = "rating_comment", columnDefinition = "TEXT")
    private String ratingComment;

    @Column(name = "recurring_group_id")
    private UUID recurringGroupId;

    @Column(name = "recurrence_index")
    private Integer recurrenceIndex;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
