package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "treatment_states")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TreatmentState {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "child_id", unique = true, nullable = false)
    private UUID childId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "game_feedback", columnDefinition = "jsonb")
    private Map<String, String> gameFeedback;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "custom_goals", columnDefinition = "jsonb")
    private List<Map<String, Object>> customGoals;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "sensory_profile", columnDefinition = "jsonb")
    private Map<String, Object> sensoryProfile;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "game_sessions", columnDefinition = "jsonb")
    private List<Map<String, Object>> gameSessions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "goal_progress_history", columnDefinition = "jsonb")
    private List<Map<String, Object>> goalProgressHistory;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
