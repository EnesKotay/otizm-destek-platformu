package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "article_comments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ArticleComment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id", nullable = false)
    private KnowledgeArticle article;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "is_experience", nullable = false)
    @Builder.Default
    private boolean isExperience = false;

    @Column(name = "duration_tried", length = 50)
    private String durationTried;

    @Column(name = "effectiveness_rating")
    private Integer effectivenessRating;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
