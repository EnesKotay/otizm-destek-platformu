package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ConversationType type = ConversationType.DIRECT;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    private String title;

    @ManyToMany
    @JoinTable(
        name = "conversation_participants",
        joinColumns = @JoinColumn(name = "conversation_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private List<User> participants = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "conversation_muted_by", joinColumns = @JoinColumn(name = "conversation_id"))
    @Column(name = "user_id")
    @Builder.Default
    private Set<UUID> mutedBy = new HashSet<>();

    @ElementCollection
    @CollectionTable(name = "conversation_archived_by", joinColumns = @JoinColumn(name = "conversation_id"))
    @Column(name = "user_id")
    @Builder.Default
    private Set<UUID> archivedBy = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
