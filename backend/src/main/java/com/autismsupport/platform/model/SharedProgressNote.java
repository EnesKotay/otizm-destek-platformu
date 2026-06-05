package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shared_progress_notes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SharedProgressNote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "child_id", nullable = false)
    private UUID childId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "from_role", nullable = false)
    private String fromRole;

    @Column(name = "from_name")
    private String fromName;

    private String type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Builder.Default
    private String status = "open";

    @Column(name = "due_date")
    private String dueDate;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "expert_id")
    private UUID expertId;

    // JSON: List<NoteReply>
    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String replies = "[]";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
