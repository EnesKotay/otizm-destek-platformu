package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "venues")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Venue {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category; // e.g., "Park", "Restaurant", "Hospital"

    @Column(columnDefinition = "TEXT")
    private String description;

    private String address;

    private Double latitude;
    private Double longitude;

    // Aggregated Sensory Scores (1.0 to 5.0)
    @Column(name = "avg_noise_level")
    private Double avgNoiseLevel;

    @Column(name = "avg_light_level")
    private Double avgLightLevel;

    @Column(name = "avg_crowd_level")
    private Double avgCrowdLevel;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
