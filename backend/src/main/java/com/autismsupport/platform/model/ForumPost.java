package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "forum_posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForumPost {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    private String category;

    @Column(name = "post_type", nullable = false)
    @Builder.Default
    private String postType = "DENEYIM";

    @Column(name = "is_pinned")
    @Builder.Default
    private boolean pinned = false;

    @Column(name = "is_answered")
    @Builder.Default
    private boolean answered = false;

    @Column(name = "is_anonymous")
    @Builder.Default
    private boolean anonymous = false;

    @Column(name = "accepted_answer_id")
    private UUID acceptedAnswerId;

    @Column(name = "like_count")
    @Builder.Default
    private int likeCount = 0;

    @Column(name = "comment_count")
    @Builder.Default
    private int commentCount = 0;

    @Column(name = "is_featured")
    @Builder.Default
    private boolean featured = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "privacy_settings", columnDefinition = "jsonb")
    private Map<String, Object> privacySettings;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "post_tags",
        joinColumns = @JoinColumn(name = "post_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
