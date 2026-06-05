package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "venue_reviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VenueReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "venue_id", nullable = false)
    private UUID venueId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "noise_level")
    private Integer noiseLevel; // 1-5 (1=Very loud, 5=Very quiet)

    @Column(name = "light_level")
    private Integer lightLevel; // 1-5 (1=Too bright, 5=Soothing)

    @Column(name = "crowd_level")
    private Integer crowdLevel; // 1-5 (1=Too crowded, 5=Empty)

    @Column(columnDefinition = "TEXT")
    private String comments;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
