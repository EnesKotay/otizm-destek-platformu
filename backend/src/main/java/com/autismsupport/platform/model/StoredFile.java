package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "stored_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoredFile {
    @Id
    private String filename;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "original_filename", length = 512)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(nullable = false)
    private long size;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Visibility visibility = Visibility.PRIVATE;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", length = 30)
    private ScopeType scopeType;

    @Column(name = "scope_id")
    private UUID scopeId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum Visibility { PRIVATE, AUTHENTICATED }
    public enum ScopeType { CHILD_PROFILE, CHILD_NOTES, CONVERSATION }
}
