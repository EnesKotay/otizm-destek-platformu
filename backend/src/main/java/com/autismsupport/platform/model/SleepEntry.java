package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sleep_entries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SleepEntry {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    private Child child;

    @Column(name = "sleep_date", nullable = false)
    private LocalDate sleepDate;

    @Column(name = "bedtime", length = 10)
    private String bedtime;

    @Column(name = "wake_time", length = 10)
    private String wakeTime;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    private Integer quality;

    @Column(name = "night_wakings")
    @Builder.Default
    private int nightWakings = 0;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
