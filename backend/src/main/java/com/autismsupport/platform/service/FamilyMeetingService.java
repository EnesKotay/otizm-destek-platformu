package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.FamilyMeetingDto;
import com.autismsupport.platform.model.FamilyMeeting;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.FamilyMeetingRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FamilyMeetingService {

    private final FamilyMeetingRepository meetingRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public List<FamilyMeetingDto> getMeetingsForUser(UUID userId) {
        return meetingRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public FamilyMeetingDto createMeeting(FamilyMeetingDto dto, UUID hostId) {
        User host = userRepository.findById(hostId)
                .orElseThrow(() -> new RuntimeException("Ev sahibi ebeveyn bulunamadı"));
        User guest = userRepository.findById(dto.getGuestParentId())
                .orElseThrow(() -> new RuntimeException("Davet edilen ebeveyn bulunamadı"));

        FamilyMeeting meeting = FamilyMeeting.builder()
                .hostParent(host)
                .guestParent(guest)
                .scheduledTime(dto.getScheduledTime())
                .notes(dto.getNotes())
                .status("PENDING")
                .build();

        meeting = meetingRepository.save(meeting);

        notificationService.createNotification(
                guest.getId(),
                "MEETING_INVITE",
                "Yeni Görüşme Daveti",
                host.getFullName() + " sizinle bir çevrimiçi görüşme talep ediyor.",
                "/similar-families"
        );

        return toDto(meeting);
    }

    @Transactional
    public FamilyMeetingDto updateMeetingStatus(UUID meetingId, String status, UUID userId) {
        FamilyMeeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Görüşme bulunamadı"));

        if (!meeting.getHostParent().getId().equals(userId) && !meeting.getGuestParent().getId().equals(userId)) {
            throw new RuntimeException("Bu işlem için yetkiniz yok");
        }

        meeting.setStatus(status);

        if ("ACCEPTED".equals(status) && meeting.getMeetingLink() == null) {
            // Generate mock meeting link
            meeting.setMeetingLink("https://meet.autismsupport.com/meet-" + meeting.getId().toString().substring(0, 8));
        }

        meetingRepository.save(meeting);

        UUID notifyUserId = meeting.getHostParent().getId().equals(userId) ? meeting.getGuestParent().getId() : meeting.getHostParent().getId();
        User actor = meeting.getHostParent().getId().equals(userId) ? meeting.getHostParent() : meeting.getGuestParent();

        notificationService.createNotification(
                notifyUserId,
                "MEETING_UPDATE",
                "Görüşme Durumu Güncellendi",
                actor.getFullName() + " görüşme talebini güncelledi: " + status,
                "/similar-families"
        );

        return toDto(meeting);
    }

    private FamilyMeetingDto toDto(FamilyMeeting m) {
        return FamilyMeetingDto.builder()
                .id(m.getId())
                .hostParentId(m.getHostParent().getId())
                .hostParentName(m.getHostParent().getFullName())
                .guestParentId(m.getGuestParent().getId())
                .guestParentName(m.getGuestParent().getFullName())
                .scheduledTime(m.getScheduledTime())
                .meetingLink(m.getMeetingLink())
                .status(m.getStatus())
                .notes(m.getNotes())
                .build();
    }
}
