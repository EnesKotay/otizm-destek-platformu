package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "knowledge_articles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnowledgeArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    private String category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(name = "is_published")
    @Builder.Default
    private boolean published = false;

    @Column(name = "view_count")
    @Builder.Default
    private int viewCount = 0;

    @Column(length = 50)
    @Builder.Default
    private String format = "TEXT"; // TEXT, VIDEO, PODCAST, STORY

    @Column(length = 500)
    private String mediaUrl;

    @Column(name = "source_name", length = 120)
    private String sourceName;

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    @Column(name = "pending_review", nullable = false)
    @Builder.Default
    private boolean pendingReview = false;

    @Column(name = "source_author", length = 300)
    private String sourceAuthor;

    @Column(name = "source_publication", length = 240)
    private String sourcePublication;

    @Column(name = "source_published_at")
    private LocalDate sourcePublishedAt;

    @Column(name = "source_accessed_at")
    private LocalDate sourceAccessedAt;

    @Column(length = 160)
    private String doi;

    @Column(name = "license_type", nullable = false, length = 40)
    @Builder.Default
    private String licenseType = "UNKNOWN";

    @Column(name = "usage_type", nullable = false, length = 40)
    @Builder.Default
    private String usageType = "ORIGINAL";

    @Column(name = "evidence_level", nullable = false, length = 40)
    @Builder.Default
    private String evidenceLevel = "EXPERT_REVIEW";

    @Column(name = "original_language", nullable = false, length = 12)
    @Builder.Default
    private String originalLanguage = "tr";

    @Column(name = "ai_generated", nullable = false)
    @Builder.Default
    private boolean aiGenerated = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "article_tags",
        joinColumns = @JoinColumn(name = "article_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private java.util.Set<Tag> tags = new java.util.HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
