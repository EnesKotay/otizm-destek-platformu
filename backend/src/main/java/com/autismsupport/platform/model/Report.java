package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(name = "target_type", nullable = false)
    private String targetType; // POST, COMMENT, USER

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Column(nullable = false)
    private String reason;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, REVIEWED, DISMISSED

    @Column(name = "admin_note")
    private String adminNote;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
