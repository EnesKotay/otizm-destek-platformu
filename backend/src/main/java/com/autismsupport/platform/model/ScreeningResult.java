package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import com.autismsupport.platform.security.EncryptedBooleanMapConverter;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "screening_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScreeningResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    private Child child;

    @Column(name = "test_type", nullable = false, length = 50)
    private String testType;

    @Column(nullable = false)
    private int score;

    @Column(name = "risk_level", nullable = false, length = 20)
    private String riskLevel;

    @Convert(converter = EncryptedBooleanMapConverter.class)
    @Column(name = "answers", columnDefinition = "TEXT")
    private Map<String, Boolean> answers;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
