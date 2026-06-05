package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "nutrition_meals")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NutritionMeal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "child_id", nullable = false)
    private UUID childId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String date;

    @Column(name = "meal_type", nullable = false)
    private String mealType;

    // JSON: list of food name strings
    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String foods = "[]";

    private String mood;

    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
