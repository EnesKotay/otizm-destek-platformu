package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "diet_preferences", uniqueConstraints = @UniqueConstraint(columnNames = "child_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DietPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "child_id", nullable = false, unique = true)
    private UUID childId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Builder.Default
    @Column(name = "gfcf_diet") private boolean gfcfDiet = false;
    @Builder.Default
    @Column(name = "sugar_free") private boolean sugarFree = false;
    @Builder.Default
    @Column(name = "dairy_free") private boolean dairyFree = false;
    @Builder.Default
    @Column(name = "gluten_free") private boolean glutenFree = false;
    @Builder.Default
    @Column(name = "soy_free") private boolean soyFree = false;
    @Builder.Default
    @Column(name = "egg_free") private boolean eggFree = false;

    @Column(name = "other_diet")
    private String otherDiet;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
