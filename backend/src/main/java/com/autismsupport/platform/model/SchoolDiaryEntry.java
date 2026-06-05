package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "school_diary_entries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SchoolDiaryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "child_id", nullable = false)
    private UUID childId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String date;

    @Column(name = "from_role", nullable = false)
    private String fromRole;

    @Column(name = "from_name")
    private String fromName;

    private String category;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    // JSON: List<DiaryReply>
    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String replies = "[]";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
