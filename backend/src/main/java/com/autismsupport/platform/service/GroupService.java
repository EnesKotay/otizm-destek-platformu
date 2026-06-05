package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.GroupDto;
import com.autismsupport.platform.dto.GroupMeetingDto;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final GroupMeetingRepository meetingRepository;

    @Transactional(readOnly = true)
    public List<GroupDto> getMyGroups(UUID userId) {
        return groupRepository.findByMemberUserId(userId).stream()
                .map(g -> toDto(g, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GroupDto> searchGroups(String query, UUID userId) {
        return groupRepository.searchGroups(normalizeSearch(query)).stream()
                .map(g -> toDto(g, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GroupDto> getGroupsByCategory(String category, UUID userId) {
        return groupRepository.findByCategory(requireText(category, "Kategori zorunludur")).stream()
                .map(g -> toDto(g, userId))
                .toList();
    }

    @Transactional
    public GroupDto createGroup(GroupDto dto, UUID userId) {
        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        String name = requireText(dto.getName(), "Grup adı zorunludur");

        Conversation conversation = Conversation.builder()
                .type(ConversationType.GROUP)
                .title(name)
                .build();
        conversation.getParticipants().add(creator);
        conversation = conversationRepository.save(conversation);

        Group group = Group.builder()
                .name(name)
                .description(normalizeOptional(dto.getDescription()))
                .category(normalizeOptional(dto.getCategory()))
                .createdBy(creator)
                .conversation(conversation)
                .build();
        group = groupRepository.save(group);

        GroupMember member = GroupMember.builder()
                .group(group)
                .user(creator)
                .role("ADMIN")
                .build();
        memberRepository.save(member);
        group.getMembers().add(member);

        return toDto(group, userId);
    }

    @Transactional
    public void joinGroup(UUID groupId, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grup bulunamadı"));
        if (memberRepository.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ValidationException("Zaten bu grubun üyesisiniz");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        GroupMember member = GroupMember.builder()
                .group(group)
                .user(user)
                .role("MEMBER")
                .build();
        memberRepository.save(member);
        group.getMembers().add(member);

        Conversation conversation = group.getConversation();
        if (conversation != null && conversation.getParticipants().stream().noneMatch(u -> u.getId().equals(userId))) {
            conversation.getParticipants().add(user);
            conversationRepository.save(group.getConversation());
        }
    }

    @Transactional
    public void leaveGroup(UUID groupId, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grup bulunamadı"));
        GroupMember member = memberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new ValidationException("Bu grubun üyesi değilsiniz"));
        if (group.getCreatedBy().getId().equals(userId)) {
            throw new ValidationException("Grup sahibi gruptan ayrılamaz; grubu silebilir veya sahipliği devredebilir.");
        }

        memberRepository.delete(member);
        group.getMembers().removeIf(m -> m.getUser().getId().equals(userId));

        if (group.getConversation() != null) {
            group.getConversation().getParticipants().removeIf(u -> u.getId().equals(userId));
            conversationRepository.save(group.getConversation());
        }
    }

    @Transactional
    public GroupDto updateGroup(UUID groupId, GroupDto dto, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grup bulunamadı"));

        if (!group.getCreatedBy().getId().equals(userId)) {
            throw new UnauthorizedException("Bu grubu düzenleme yetkiniz yok");
        }

        String name = requireText(dto.getName(), "Grup adı zorunludur");
        group.setName(name);
        group.setDescription(normalizeOptional(dto.getDescription()));
        group.setCategory(normalizeOptional(dto.getCategory()));
        if (group.getConversation() != null) {
            group.getConversation().setTitle(name);
            conversationRepository.save(group.getConversation());
        }

        group = groupRepository.save(group);
        return toDto(group, userId);
    }

    @Transactional
    public void deleteGroup(UUID groupId, UUID userId, String userRole) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grup bulunamadı"));

        boolean isAdmin = "ADMIN".equals(userRole);
        boolean isCreator = group.getCreatedBy().getId().equals(userId);

        if (!isCreator && !isAdmin) {
            throw new UnauthorizedException("Bu grubu silme yetkiniz yok");
        }

        Conversation conversation = group.getConversation();

        // Break link first to avoid constraint issues during database updates
        group.setConversation(null);
        groupRepository.saveAndFlush(group);

        if (conversation != null) {
            messageRepository.deleteByConversationId(conversation.getId());
            conversationRepository.delete(conversation);
        }

        groupRepository.delete(group);
    }

    @Transactional
    public GroupDto toggleVerification(UUID groupId, UUID userId, String userRole) {
        if (!"ADMIN".equals(userRole)) {
            throw new UnauthorizedException("Bu işlem için admin yetkisi gerekiyor");
        }

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grup bulunamadı"));

        group.setVerified(!group.isVerified());
        group = groupRepository.save(group);
        return toDto(group, userId);
    }

    public List<UserDto> getGroupMembers(UUID groupId, UUID currentUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grup bulunamadı"));

        return group.getMembers().stream()
                .map(m -> {
                    User u = m.getUser();
                    return UserDto.builder()
                            .id(u.getId())
                            .email(u.getEmail())
                            .fullName(u.getFullName())
                            .phone(u.getPhone())
                            .role(u.getRole().name())
                            .expertTitle(u.getExpertTitle())
                            .city(u.getCity())
                            .institution(u.getInstitution())
                            .licenseNumber(u.getLicenseNumber())
                            .bio(u.getBio())
                            .verified(u.isVerified())
                            .licenseVerified(u.isLicenseVerified())
                            .profileImageUrl(u.getProfileImageUrl())
                            .createdAt(u.getCreatedAt())
                            .build();
                })
                .toList();
    }

    public List<GroupMeetingDto> getMeetings(UUID groupId, UUID currentUserId) {
        if (!groupRepository.existsById(groupId)) {
            throw new ResourceNotFoundException("Grup bulunamadı");
        }
        return meetingRepository.findByGroupIdOrderByStartTimeAsc(groupId).stream()
                .map(this::toMeetingDto)
                .toList();
    }

    @Transactional
    public GroupMeetingDto createMeeting(UUID groupId, GroupMeetingDto dto, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grup bulunamadı"));

        boolean isCreator = group.getCreatedBy().getId().equals(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
        boolean isAdmin = user.getRole() == UserRole.ADMIN;

        if (!isCreator && !isAdmin) {
            throw new UnauthorizedException("Bu grup için buluşma planlama yetkiniz yok");
        }

        GroupMeeting meeting = GroupMeeting.builder()
                .group(group)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .meetingUrl(dto.getMeetingUrl())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .build();

        meeting = meetingRepository.save(meeting);
        return toMeetingDto(meeting);
    }

    @Transactional
    public void deleteMeeting(UUID groupId, UUID meetingId, UUID userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grup bulunamadı"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        boolean isCreator = group.getCreatedBy().getId().equals(userId);
        boolean isAdmin = user.getRole() == UserRole.ADMIN;

        if (!isCreator && !isAdmin) {
            throw new UnauthorizedException("Bu buluşmayı silme yetkiniz yok");
        }

        GroupMeeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new ResourceNotFoundException("Buluşma bulunamadı"));

        if (!meeting.getGroup().getId().equals(groupId)) {
            throw new ResourceNotFoundException("Buluşma bu gruba ait değil");
        }

        meetingRepository.delete(meeting);
    }

    private String normalizeSearch(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String requireText(String value, String message) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new ValidationException(message);
        }
        return normalized;
    }

    private GroupMeetingDto toMeetingDto(GroupMeeting meeting) {
        return GroupMeetingDto.builder()
                .id(meeting.getId())
                .groupId(meeting.getGroup().getId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .meetingUrl(meeting.getMeetingUrl())
                .startTime(meeting.getStartTime())
                .endTime(meeting.getEndTime())
                .createdAt(meeting.getCreatedAt())
                .build();
    }

    private GroupDto toDto(Group group, UUID currentUserId) {
        boolean isMember = memberRepository.existsByGroupIdAndUserId(group.getId(), currentUserId);
        
        long expertCount = group.getMembers().stream()
                .filter(m -> m.getUser().getRole() == UserRole.EXPERT)
                .count();

        return GroupDto.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .category(group.getCategory())
                .verified(group.isVerified())
                .avatarUrl(group.getAvatarUrl())
                .memberCount(group.getMembers().size())
                .expertCount((int) expertCount)
                .createdByUserId(group.getCreatedBy().getId())
                .isMember(isMember)
                .conversationId(group.getConversation() != null ? group.getConversation().getId() : null)
                .createdAt(group.getCreatedAt())
                .build();
    }
}
