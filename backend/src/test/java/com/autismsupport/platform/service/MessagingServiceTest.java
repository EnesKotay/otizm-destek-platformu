package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ConversationDto;
import com.autismsupport.platform.dto.MessageDto;
import com.autismsupport.platform.model.Conversation;
import com.autismsupport.platform.model.ConversationType;
import com.autismsupport.platform.model.Group;
import com.autismsupport.platform.model.GroupMember;
import com.autismsupport.platform.model.Message;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ConversationRepository;
import com.autismsupport.platform.repository.GroupRepository;
import com.autismsupport.platform.repository.MessageReactionRepository;
import com.autismsupport.platform.repository.MessageReadReceiptRepository;
import com.autismsupport.platform.repository.MessageRepository;
import com.autismsupport.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessagingServiceTest {

    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private MessageRepository messageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private GroupRepository groupRepository;
    @Mock
    private MessageReactionRepository messageReactionRepository;
    @Mock
    private MessageReadReceiptRepository readReceiptRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private MessagingService messagingService;

    private User testUser1;
    private User testUser2;
    private Conversation testConversation;
    private Message testMessage;

    @BeforeEach
    void setUp() {
        testUser1 = new User();
        testUser1.setId(UUID.randomUUID());
        testUser1.setFullName("User One");

        testUser2 = new User();
        testUser2.setId(UUID.randomUUID());
        testUser2.setFullName("User Two");

        testConversation = new Conversation();
        testConversation.setId(UUID.randomUUID());
        testConversation.setType(ConversationType.DIRECT);
        testConversation.setParticipants(new ArrayList<>(List.of(testUser1, testUser2)));

        testMessage = new Message();
        testMessage.setId(UUID.randomUUID());
        testMessage.setConversation(testConversation);
        testMessage.setSender(testUser1);
        testMessage.setContent("Hello World");
        testMessage.setSentAt(LocalDateTime.now());
    }

    @Test
    void getOrCreateDirectConversation_shouldReturnExisting() {
        when(conversationRepository.findDirectConversation(testUser1.getId(), testUser2.getId()))
                .thenReturn(Optional.of(testConversation));

        ConversationDto result = messagingService.getOrCreateDirectConversation(testUser1.getId(), testUser2.getId());

        assertNotNull(result);
        assertEquals(testConversation.getId(), result.getId());
        verify(conversationRepository, never()).save(any(Conversation.class));
    }

    @Test
    void getOrCreateDirectConversation_shouldCreateNewWhenNotFound() {
        when(conversationRepository.findDirectConversation(testUser1.getId(), testUser2.getId()))
                .thenReturn(Optional.empty());
        when(userRepository.findById(testUser1.getId())).thenReturn(Optional.of(testUser1));
        when(userRepository.findById(testUser2.getId())).thenReturn(Optional.of(testUser2));
        
        Conversation newConv = new Conversation();
        newConv.setId(UUID.randomUUID());
        newConv.setType(ConversationType.DIRECT);
        newConv.setParticipants(new ArrayList<>(List.of(testUser1, testUser2)));
        
        when(conversationRepository.save(any(Conversation.class))).thenReturn(newConv);

        ConversationDto result = messagingService.getOrCreateDirectConversation(testUser1.getId(), testUser2.getId());

        assertNotNull(result);
        assertEquals(newConv.getId(), result.getId());
        verify(conversationRepository).save(any(Conversation.class));
    }

    @Test
    void getOrCreateDirectConversation_shouldRejectSelfConversation() {
        assertThrows(RuntimeException.class,
                () -> messagingService.getOrCreateDirectConversation(testUser1.getId(), testUser1.getId()));

        verify(conversationRepository, never()).findDirectConversation(any(), any());
    }

    @Test
    void sendMessage_shouldSaveMessageAndReturnDto() {
        when(conversationRepository.findById(testConversation.getId())).thenReturn(Optional.of(testConversation));
        when(userRepository.findById(testUser1.getId())).thenReturn(Optional.of(testUser1));
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> {
            Message m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        MessageDto result = messagingService.sendMessage(testConversation.getId(), testUser1.getId(), "Test Msg");

        assertNotNull(result);
        assertEquals("Test Msg", result.getContent());
        verify(messageRepository).save(any(Message.class));
        verify(conversationRepository).save(any(Conversation.class)); // Updates lastMessageAt
        verify(messagingTemplate, atLeastOnce()).convertAndSendToUser(anyString(), anyString(), anyMap());
    }

    @Test
    void sendMessage_shouldRejectBlankTextMessageWithoutFile() {
        when(conversationRepository.findById(testConversation.getId())).thenReturn(Optional.of(testConversation));
        when(userRepository.findById(testUser1.getId())).thenReturn(Optional.of(testUser1));

        assertThrows(RuntimeException.class,
                () -> messagingService.sendMessage(testConversation.getId(), testUser1.getId(), "   "));

        verify(messageRepository, never()).save(any(Message.class));
    }

    @Test
    void sendMessage_shouldNormalizeFileMessageType() {
        when(conversationRepository.findById(testConversation.getId())).thenReturn(Optional.of(testConversation));
        when(userRepository.findById(testUser1.getId())).thenReturn(Optional.of(testUser1));
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> {
            Message m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        MessageDto result = messagingService.sendMessage(
                testConversation.getId(),
                testUser1.getId(),
                " ",
                null,
                " https://example.com/file.pdf ",
                " file.pdf ",
                " application/pdf ",
                null);

        assertEquals("FILE", result.getMessageType());
        assertEquals("https://example.com/file.pdf", result.getFileUrl());
        assertEquals("", result.getContent());
    }

    @Test
    void getOrCreateGroupConversation_shouldRejectNonMembers() {
        User outsider = new User();
        outsider.setId(UUID.randomUUID());
        outsider.setFullName("Outsider");

        Group group = Group.builder()
                .id(UUID.randomUUID())
                .name("Support Group")
                .members(new ArrayList<>(List.of(GroupMember.builder()
                        .user(testUser1)
                        .build())))
                .build();

        when(groupRepository.findById(group.getId())).thenReturn(Optional.of(group));

        assertThrows(RuntimeException.class,
                () -> messagingService.getOrCreateGroupConversation(group.getId(), outsider.getId()));

        verify(conversationRepository, never()).save(any(Conversation.class));
    }
}
