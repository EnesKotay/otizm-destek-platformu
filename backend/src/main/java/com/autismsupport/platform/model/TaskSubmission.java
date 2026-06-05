package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "task_submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private ExpertTask task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id", nullable = false)
    private User parent;

    @Column(columnDefinition = "TEXT")
    private String parentNote; // Note from the parent like "He did well today"

    @Column(name = "evidence_url")
    private String evidenceUrl; // Video or photo URL uploaded by the parent

    @Column(name = "expert_feedback", columnDefinition = "TEXT")
    private String expertFeedback; // Feedback from the expert after reviewing

    @Column(name = "expert_reviewed")
    @Builder.Default
    private boolean expertReviewed = false;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    private LocalDateTime submittedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
