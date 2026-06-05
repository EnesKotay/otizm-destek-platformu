package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "goals")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "child_id", nullable = false)
    private UUID childId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String category;

    @Column(name = "target_count")
    @Builder.Default
    private int targetCount = 10;

    @Column(name = "token_color")
    @Builder.Default
    private String tokenColor = "#6366f1";

    @Column(name = "token_emoji")
    @Builder.Default
    private String tokenEmoji = "⭐";

    @Column(name = "reward_title")
    private String rewardTitle;

    @Column(name = "reward_description")
    private String rewardDescription;

    @Builder.Default
    private boolean active = true;

    // JSON: List<GoalEntry>
    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String entries = "[]";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
