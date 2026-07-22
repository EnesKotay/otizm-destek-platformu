package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ConversationDto;
import com.autismsupport.platform.dto.MessageDto;
import com.autismsupport.platform.dto.ReactionSummaryDto;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.ConversationRepository;
import com.autismsupport.platform.repository.GroupRepository;
import com.autismsupport.platform.repository.MessageReactionRepository;
import com.autismsupport.platform.repository.MessageRepository;
import com.autismsupport.platform.repository.MessageReadReceiptRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessagingService {

    private static final int MAX_MESSAGE_LENGTH = 4000;
    private static final int MAX_EMOJI_LENGTH = 10;
    private static final Set<String> SUPPORTED_MESSAGE_TYPES = Set.of("TEXT", "FILE", "IMAGE", "PECS");

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final MessageReactionRepository reactionRepository;
    private final MessageReadReceiptRepository readReceiptRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final FcmPushService fcmPushService;
    private final WebPushService webPushService;

    @Transactional(readOnly = true)
    public List<ConversationDto> getConversations(UUID userId) {
        return getConversations(userId, null, null);
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> getConversations(UUID userId, String search, Boolean archived) {
        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        List<Conversation> conversations = normalizedSearch == null
                ? conversationRepository.findUserConversations(userId, archived)
                : conversationRepository.searchConversations(userId, normalizedSearch, archived);

        return conversations.stream()
                .map(conv -> toConversationDto(conv, userId))
                .toList();
    }

    @Transactional
    public ConversationDto getOrCreateDirectConversation(UUID userId, UUID otherUserId) {
        if (userId.equals(otherUserId)) {
            throw new RuntimeException("Kendinizle birebir konuşma başlatamazsınız");
        }
        return conversationRepository.findDirectConversation(userId, otherUserId)
                .map(conv -> toConversationDto(conv, userId))
                .orElseGet(() -> {
                    User user1 = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
                    User user2 = userRepository.findById(otherUserId)
                            .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

                    Conversation conv = Conversation.builder()
                            .type(ConversationType.DIRECT)
                            .build();
                    conv.getParticipants().add(user1);
                    conv.getParticipants().add(user2);
                    conv = conversationRepository.save(conv);

                    return toConversationDto(conv, userId);
                });
    }

    @Transactional
    public ConversationDto createGroupConversation(UUID creatorId, String title, List<UUID> participantIds) {
        Set<UUID> uniqueIds = new LinkedHashSet<>();
        uniqueIds.add(creatorId);
        if (participantIds != null) {
            uniqueIds.addAll(participantIds);
        }
        if (uniqueIds.size() < 2) {
            throw new RuntimeException("Grup konuşması için en az iki katılımcı gerekir");
        }

        // Tek sorguda tüm katılımcıları çek (N+1'i önler)
        List<User> fetched = userRepository.findAllById(uniqueIds);
        if (fetched.size() != uniqueIds.size()) {
            throw new RuntimeException("Kullanıcı bulunamadı");
        }
        // Oluşturucu listenin başında yer alacak şekilde sırala
        List<User> participants = new ArrayList<>();
        fetched.stream().filter(u -> u.getId().equals(creatorId)).findFirst().ifPresent(participants::add);
        fetched.stream().filter(u -> !u.getId().equals(creatorId)).forEach(participants::add);

        String normalizedTitle = normalizeGroupTitle(title);
        Conversation conversation = Conversation.builder()
                .type(ConversationType.GROUP)
                .title(normalizedTitle)
                .participants(participants)
                .build();

        return toConversationDto(conversationRepository.save(conversation), creatorId);
    }

    @Transactional
    public ConversationDto getOrCreateGroupConversation(UUID groupId, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grup bulunamadı"));
        boolean isGroupMember = group.getMembers().stream()
                .map(GroupMember::getUser)
                .filter(Objects::nonNull)
                .anyMatch(user -> user.getId().equals(userId));
        if (!isGroupMember) {
            throw new RuntimeException("Bu grubun konuşmasına erişim yetkiniz yok");
        }

        if (group.getConversation() != null) {
            boolean alreadyParticipant = group.getConversation().getParticipants().stream()
                    .anyMatch(user -> user.getId().equals(userId));
            if (!alreadyParticipant) {
                group.getConversation().getParticipants().add(userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı")));
                conversationRepository.save(group.getConversation());
            }
            return toConversationDto(group.getConversation(), userId);
        }

        List<User> participants = group.getMembers().stream()
                .map(GroupMember::getUser)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(ArrayList::new));

        Conversation conversation = conversationRepository.save(Conversation.builder()
                .type(ConversationType.GROUP)
                .title(group.getName())
                .participants(participants)
                .build());

        group.setConversation(conversation);
        groupRepository.save(group);

        return toConversationDto(conversation, userId);
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> getMessages(UUID conversationId, UUID userId, Pageable pageable) {
        assertParticipant(conversationId, userId);
        return messageRepository.findByConversationIdOrderBySentAtDesc(conversationId, pageable)
                .map(message -> toMessageDto(message, userId));
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> searchMessages(UUID conversationId, UUID userId, String query, Pageable pageable) {
        assertParticipant(conversationId, userId);
        return messageRepository.findByConversationIdAndContentContainingIgnoreCaseOrderBySentAtDesc(conversationId, query, pageable)
                .map(message -> toMessageDto(message, userId));
    }

    @Transactional
    public MessageDto sendMessage(UUID conversationId, UUID senderId, String content) {
        return sendMessage(conversationId, senderId, content, "TEXT", null, null, null, null);
    }

    @Transactional
    public MessageDto sendMessage(UUID conversationId, UUID senderId, String content, String messageType,
                                  String fileUrl, String fileName, String fileType, UUID replyToId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Konuşma bulunamadı"));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        assertParticipant(conversation, senderId);
        String normalizedFileUrl = blankToNull(fileUrl);
        String normalizedMessageType = normalizeMessageType(messageType, normalizedFileUrl);
        String normalizedContent = normalizeMessageContent(content, normalizedMessageType, normalizedFileUrl);

        Message replyTo = null;
        if (replyToId != null) {
            replyTo = messageRepository.findById(replyToId)
                    .orElseThrow(() -> new RuntimeException("Yanıtlanan mesaj bulunamadı"));
            if (!replyTo.getConversation().getId().equals(conversationId)) {
                throw new RuntimeException("Yanıtlanan mesaj bu konuşmaya ait değil");
            }
        }

        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content(normalizedContent)
                .messageType(normalizedMessageType)
                .fileUrl(normalizedFileUrl)
                .fileName(blankToNull(fileName))
                .fileType(blankToNull(fileType))
                .replyTo(replyTo)
                .sentAt(LocalDateTime.now())
                .build();

        message = messageRepository.save(message);
        conversation.setLastMessageAt(message.getSentAt());
        conversationRepository.save(conversation);

        MessageDto messageDto = toMessageDto(message);

        // Konuşma kanalına broadcast — tüm katılımcıların frontend'i bunu dinliyor
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversation.getId(),
                messageDto
        );

        // Kullanıcı bazlı conversation-update bildirimi (okunmamış badge + konuşma listesi)
        for (User participant : conversation.getParticipants()) {
            messagingTemplate.convertAndSendToUser(
                    participant.getId().toString(),
                    "/queue/conversation-update",
                    Map.of(
                            "conversationId", conversation.getId(),
                            "lastMessage", toMessageDto(message, participant.getId())
                    )
            );
        }
        sendMobileMessageNotifications(conversation, message, sender);

        return messageDto;
    }

    @Transactional(readOnly = true)
    public void assertParticipant(UUID conversationId, UUID userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Konuşma bulunamadı"));
        assertParticipant(conversation, userId);
    }

    @Transactional(readOnly = true)
    public void ensureParticipant(UUID conversationId, UUID userId) {
        assertParticipant(conversationId, userId);
    }

    @Transactional
    public void muteConversation(UUID conversationId, UUID userId, boolean muted) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Konuşma bulunamadı"));
        assertParticipant(conversation, userId);
        if (muted) {
            conversation.getMutedBy().add(userId);
        } else {
            conversation.getMutedBy().remove(userId);
        }
        conversationRepository.save(conversation);
    }

    @Transactional
    public void archiveConversation(UUID conversationId, UUID userId, boolean archived) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Konuşma bulunamadı"));
        assertParticipant(conversation, userId);
        if (archived) {
            conversation.getArchivedBy().add(userId);
        } else {
            conversation.getArchivedBy().remove(userId);
        }
        conversationRepository.save(conversation);
    }

    @Transactional
    public MessageDto toggleReaction(UUID messageId, UUID userId, String emoji) {
        String normalizedEmoji = emoji == null ? null : emoji.trim();
        if (normalizedEmoji == null || normalizedEmoji.isBlank()) {
            throw new RuntimeException("Emoji zorunludur");
        }
        if (normalizedEmoji.length() > MAX_EMOJI_LENGTH) {
            throw new RuntimeException("Emoji en fazla " + MAX_EMOJI_LENGTH + " karakter olabilir");
        }

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Mesaj bulunamadı"));
        assertParticipant(message.getConversation(), userId);

        if (reactionRepository.existsByMessageIdAndUserIdAndEmoji(messageId, userId, normalizedEmoji)) {
            reactionRepository.deleteByMessageIdAndUserIdAndEmoji(messageId, userId, normalizedEmoji);
        } else {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
            reactionRepository.save(MessageReaction.builder()
                    .message(message)
                    .user(user)
                    .emoji(normalizedEmoji)
                    .build());
        }

        return toMessageDto(message, userId);
    }

    @Transactional
    public ConversationDto addMember(UUID conversationId, UUID requesterId, UUID userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Konuşma bulunamadı"));
        assertParticipant(conversation, requesterId);
        ensureGroupConversation(conversation);

        boolean alreadyParticipant = conversation.getParticipants().stream()
                .anyMatch(user -> user.getId().equals(userId));
        if (!alreadyParticipant) {
            conversation.getParticipants().add(userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı")));
        }

        return toConversationDto(conversationRepository.save(conversation), requesterId);
    }

    @Transactional
    public void deleteMessage(UUID messageId, UUID requesterId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Mesaj bulunamadı"));
        
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        boolean isSender = message.getSender().getId().equals(requesterId);
        boolean isAdmin = com.autismsupport.platform.model.UserRole.ADMIN.equals(requester.getRole());
        boolean isCreator = false;

        if (message.getConversation().getType() == ConversationType.GROUP) {
            java.util.Optional<Group> groupOpt = groupRepository.findByConversationId(message.getConversation().getId());
            if (groupOpt.isPresent()) {
                isCreator = groupOpt.get().getCreatedBy() != null && groupOpt.get().getCreatedBy().getId().equals(requesterId);
            }
        }

        if (!isSender && !isAdmin && !isCreator) {
            throw new RuntimeException("Bu mesajı silme yetkiniz yok");
        }

        UUID conversationId = message.getConversation().getId();
        messageRepository.delete(message);

        // Silme işlemini konuşmadaki diğer katılımcılara gerçek zamanlı bildir
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId,
                Map.of(
                        "type", "MESSAGE_DELETED",
                        "messageId", messageId.toString()
                )
        );
    }

    @Transactional
    public ConversationDto removeMember(UUID conversationId, UUID requesterId, UUID userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Konuşma bulunamadı"));
        assertParticipant(conversation, requesterId);
        ensureGroupConversation(conversation);
        if (requesterId.equals(userId)) {
            throw new RuntimeException("Kendinizi grup konuşmasından çıkaramazsınız");
        }

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        boolean isAdmin = com.autismsupport.platform.model.UserRole.ADMIN.equals(requester.getRole());
        boolean isCreator = false;
        
        java.util.Optional<Group> groupOpt = groupRepository.findByConversationId(conversationId);
        if (groupOpt.isPresent()) {
            isCreator = groupOpt.get().getCreatedBy() != null && groupOpt.get().getCreatedBy().getId().equals(requesterId);
        }

        if (!isAdmin && !isCreator) {
            throw new RuntimeException("Gruptan üye çıkarma yetkiniz yok");
        }

        conversation.getParticipants().removeIf(user -> user.getId().equals(userId));
        
        // Also remove from group members if applicable
        if (groupOpt.isPresent()) {
            Group group = groupOpt.get();
            group.getMembers().removeIf(m -> m.getUser().getId().equals(userId));
            groupRepository.save(group);
        }

        if (conversation.getParticipants().size() < 2) {
            throw new RuntimeException("Grup konuşmasında en az iki katılımcı kalmalıdır");
        }
        return toConversationDto(conversationRepository.save(conversation), requesterId);
    }

    @Transactional
    public ConversationDto updateGroupTitle(UUID conversationId, UUID requesterId, String title) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Konuşma bulunamadı"));
        assertParticipant(conversation, requesterId);
        ensureGroupConversation(conversation);

        conversation.setTitle(normalizeGroupTitle(title));
        return toConversationDto(conversationRepository.save(conversation), requesterId);
    }

    @Transactional
    public void markAsRead(UUID conversationId, UUID userId) {
        assertParticipant(conversationId, userId);
        List<Message> unread = readReceiptRepository.findUnreadMessages(conversationId, userId);
        if (unread.isEmpty()) return;
        User user = userRepository.findById(userId).orElseThrow();
        for (Message m : unread) {
            readReceiptRepository.save(MessageReadReceipt.builder()
                    .message(m)
                    .user(user)
                    .build());
        }
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId,
                Map.of(
                        "type", "READ_RECEIPT",
                        "readBy", userId.toString()
                )
        );
    }

    public long getTotalUnreadCount(UUID userId) {
        return readReceiptRepository.countTotalUnreadMessages(userId);
    }

    private ConversationDto toConversationDto(Conversation conv, UUID currentUserId) {
        List<UserDto> participantDtos = conv.getParticipants().stream()
                .map(u -> UserDto.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .role(u.getRole() != null ? u.getRole().name() : null)
                        .profileImageUrl(u.getProfileImageUrl())
                        .build())
                .toList();

        long unread = readReceiptRepository.countUnreadMessages(conv.getId(), currentUserId);

        MessageDto lastMessage = messageRepository.findFirstByConversationIdOrderBySentAtDesc(conv.getId())
                .map(message -> toMessageDto(message, currentUserId))
                .orElse(null);

        return ConversationDto.builder()
                .id(conv.getId())
                .type(conv.getType().name())
                .title(conv.getTitle())
                .participants(participantDtos)
                .lastMessage(lastMessage)
                .unreadCount(unread)
                .lastMessageAt(conv.getLastMessageAt())
                .muted(conv.getMutedBy().contains(currentUserId))
                .archived(conv.getArchivedBy().contains(currentUserId))
                .createdAt(conv.getCreatedAt())
                .build();
    }

    private MessageDto toMessageDto(Message msg) {
        return toMessageDto(msg, null);
    }

    private MessageDto toMessageDto(Message msg, UUID currentUserId) {
        Map<String, ReactionSummaryDto> reactions = reactionRepository.findByMessageIdWithUser(msg.getId()).stream()
                .collect(Collectors.groupingBy(
                        MessageReaction::getEmoji,
                        Collectors.collectingAndThen(Collectors.toList(), grouped -> ReactionSummaryDto.builder()
                                .count(grouped.size())
                                .reactedByMe(currentUserId != null && grouped.stream()
                                        .anyMatch(reaction -> reaction.getUser().getId().equals(currentUserId)))
                                .build())
                ));

        return MessageDto.builder()
                .id(msg.getId())
                .conversationId(msg.getConversation().getId())
                .senderId(msg.getSender().getId())
                .senderName(msg.getSender().getFullName())
                .senderProfileImage(msg.getSender().getProfileImageUrl())
                .content(msg.getContent())
                .messageType(msg.getMessageType())
                .read(currentUserId != null && msg.getReadReceipts().stream().anyMatch(r -> r.getUser().getId().equals(currentUserId)))
                .sentAt(msg.getSentAt())
                .fileUrl(msg.getFileUrl())
                .fileName(msg.getFileName())
                .fileType(msg.getFileType())
                .replyToId(msg.getReplyTo() != null ? msg.getReplyTo().getId() : null)
                .replyToContent(msg.getReplyTo() != null ? msg.getReplyTo().getContent() : null)
                .replyToSenderName(msg.getReplyTo() != null ? msg.getReplyTo().getSender().getFullName() : null)
                .replyToFileUrl(msg.getReplyTo() != null ? msg.getReplyTo().getFileUrl() : null)
                .reactions(reactions)
                .readBy(msg.getReadReceipts().stream()
                        .map(r -> UserDto.builder()
                                .id(r.getUser().getId())
                                .fullName(r.getUser().getFullName())
                                .profileImageUrl(r.getUser().getProfileImageUrl())
                                .build())
                        .toList())
                .build();
    }

    private void assertParticipant(Conversation conversation, UUID userId) {
        boolean participant = conversation.getParticipants().stream()
                .anyMatch(user -> user.getId().equals(userId));
        if (!participant) {
            throw new RuntimeException("Bu konuşmaya erişim yetkiniz yok");
        }
    }

    private void ensureGroupConversation(Conversation conversation) {
        if (conversation.getType() != ConversationType.GROUP) {
            throw new RuntimeException("Bu işlem yalnızca grup konuşmaları için geçerlidir");
        }
    }

    private void sendMobileMessageNotifications(Conversation conversation, Message message, User sender) {
        for (User participant : conversation.getParticipants()) {
            if (participant.getId().equals(sender.getId())) {
                continue;
            }
            if (conversation.getMutedBy().contains(participant.getId())) {
                continue;
            }
            String conversationTitle = conversationTitleForNotification(conversation, sender);
            String body = messageNotificationBody(conversation, message, sender);

            fcmPushService.sendMessageNotification(
                    participant.getId(),
                    conversationTitle,
                    body,
                    conversation.getId(),
                    conversationTitle
            );

            webPushService.sendToUser(
                    participant.getId(),
                    conversationTitle,
                    body,
                    "/mesajlar?conversationId=" + conversation.getId()
            );
        }
    }

    private String conversationTitleForNotification(Conversation conversation, User sender) {
        if (conversation.getType() == ConversationType.GROUP) {
            return conversation.getTitle() == null || conversation.getTitle().isBlank()
                    ? "Grup sohbeti"
                    : conversation.getTitle();
        }
        return sender.getFullName();
    }

    private String messageNotificationBody(Conversation conversation, Message message, User sender) {
        String content = switch (message.getMessageType()) {
            case "IMAGE" -> "Gorsel gonderdi";
            case "FILE" -> "Dosya gonderdi";
            case "PECS" -> "PECS mesaji gonderdi";
            default -> message.getContent();
        };
        if (content == null || content.isBlank()) {
            content = "Yeni mesaj";
        }
        if (content.length() > 120) {
            content = content.substring(0, 117) + "...";
        }
        if (conversation.getType() == ConversationType.GROUP) {
            return sender.getFullName() + ": " + content;
        }
        return content;
    }

    private String normalizeGroupTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new RuntimeException("Grup adı zorunludur");
        }
        return title.trim();
    }

    private String normalizeMessageType(String messageType, String fileUrl) {
        if (messageType == null || messageType.isBlank()) {
            return fileUrl == null ? "TEXT" : "FILE";
        }
        String normalized = messageType.trim().toUpperCase();
        if (!SUPPORTED_MESSAGE_TYPES.contains(normalized)) {
            throw new RuntimeException("Geçersiz mesaj tipi");
        }
        if (fileUrl != null && "TEXT".equals(normalized)) {
            return "FILE";
        }
        return normalized;
    }

    private String normalizeMessageContent(String content, String messageType, String fileUrl) {
        String normalized = content == null ? "" : content.trim();
        if (normalized.length() > MAX_MESSAGE_LENGTH) {
            throw new RuntimeException("Mesaj en fazla " + MAX_MESSAGE_LENGTH + " karakter olabilir");
        }
        if (fileUrl == null && normalized.isBlank()) {
            throw new RuntimeException("Boş mesaj gönderilemez");
        }
        if (("FILE".equals(messageType) || "IMAGE".equals(messageType)) && fileUrl == null) {
            throw new RuntimeException("Dosya mesajı için dosya adresi zorunludur");
        }
        return normalized;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
