package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import com.autismsupport.platform.security.EncryptedStringConverter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Convert(converter = EncryptedStringConverter.class)
    private String content;

    @Column(name = "message_type", nullable = false, length = 30)
    @Builder.Default
    private String messageType = "TEXT";

    @Column(name = "is_read")
    @Builder.Default
    private boolean read = false;

    @Column(name = "file_url", length = 1000)
    private String fileUrl;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_type", length = 100)
    private String fileType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_id")
    private Message replyTo;

    @Column(name = "sent_at", nullable = false)
    @Builder.Default
    private LocalDateTime sentAt = LocalDateTime.now();

    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.Set<MessageReadReceipt> readReceipts = new java.util.HashSet<>();
}
