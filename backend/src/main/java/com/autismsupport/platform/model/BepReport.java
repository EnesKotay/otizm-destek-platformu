package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import com.autismsupport.platform.security.EncryptedGoalsConverter;
import com.autismsupport.platform.security.EncryptedStringConverter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "bep_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BepReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    private Child child;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "student_name", nullable = false, columnDefinition = "TEXT")
    @Convert(converter = EncryptedStringConverter.class)
    private String studentName;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedStringConverter.class)
    private String diagnosis;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = EncryptedStringConverter.class)
    private String performance;

    @Convert(converter = EncryptedGoalsConverter.class)
    @Column(name = "goals", columnDefinition = "TEXT")
    private List<Map<String, Object>> goals;

    @Column(name = "school_year")
    private String schoolYear;

    @CreationTimestamp
    @Column(name = "shared_at", updatable = false)
    private LocalDateTime sharedAt;
}
