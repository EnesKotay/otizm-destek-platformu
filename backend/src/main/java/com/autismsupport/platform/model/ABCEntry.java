package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "abc_entries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ABCEntry {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    private Child child;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "entry_time")
    private LocalTime entryTime;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String antecedent;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String behavior;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String consequence;

    @Column(nullable = false)
    private int intensity;

    @Column
    private String category;

    @Column
    private String location;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
