package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.MeetupRequestDto;
import com.autismsupport.platform.model.MeetupRequest;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.MeetupRequestRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MeetupRequestService {

    private final MeetupRequestRepository meetupRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMMM yyyy");

    public List<MeetupRequestDto> getRequestsForUser(UUID userId) {
        return meetupRequestRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public MeetupRequestDto createRequest(MeetupRequestDto dto, UUID requesterId) {
        if (requesterId.equals(dto.getRecipientId())) {
            throw new RuntimeException("Kendinize buluşma isteği gönderemezsiniz.");
        }

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        User recipient = userRepository.findById(dto.getRecipientId())
                .orElseThrow(() -> new RuntimeException("Davet edilen ebeveyn bulunamadı"));

        MeetupRequest request = MeetupRequest.builder()
                .requester(requester)
                .recipient(recipient)
                .type(dto.getType())
                .proposedDate(dto.getProposedDate())
                .proposedTime(dto.getProposedTime())
                .location(dto.getLocation())
                .message(dto.getMessage())
                .status("PENDING")
                .build();

        request = meetupRequestRepository.save(request);

        notificationService.createNotification(
                recipient.getId(),
                "MEETUP_REQUEST",
                "Yeni Buluşma İsteği",
                requester.getFullName() + " sizinle " + request.getProposedDate().format(DATE_FORMAT) + " tarihinde bir buluşma önerdi.",
                "/benzer-aileler"
        );

        return toDto(request);
    }

    @Transactional
    public MeetupRequestDto updateStatus(UUID requestId, String status, UUID userId) {
        MeetupRequest request = meetupRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Buluşma isteği bulunamadı"));

        boolean isRecipient = request.getRecipient().getId().equals(userId);
        boolean isRequester = request.getRequester().getId().equals(userId);
        if (!isRecipient && !isRequester) {
            throw new RuntimeException("Bu işlem için yetkiniz yok");
        }
        if (("ACCEPTED".equals(status) || "DECLINED".equals(status)) && !isRecipient) {
            throw new RuntimeException("Bu isteği yalnızca davet edilen kişi yanıtlayabilir");
        }

        request.setStatus(status);
        meetupRequestRepository.save(request);

        UUID notifyUserId = isRequester ? request.getRecipient().getId() : request.getRequester().getId();
        User actor = isRequester ? request.getRequester() : request.getRecipient();

        notificationService.createNotification(
                notifyUserId,
                "MEETUP_UPDATE",
                "Buluşma İsteği Güncellendi",
                actor.getFullName() + " buluşma isteğini güncelledi: " + status,
                "/benzer-aileler"
        );

        return toDto(request);
    }

    private MeetupRequestDto toDto(MeetupRequest m) {
        return MeetupRequestDto.builder()
                .id(m.getId())
                .requesterId(m.getRequester().getId())
                .requesterName(m.getRequester().getFullName())
                .recipientId(m.getRecipient().getId())
                .recipientName(m.getRecipient().getFullName())
                .type(m.getType())
                .proposedDate(m.getProposedDate())
                .proposedTime(m.getProposedTime())
                .location(m.getLocation())
                .message(m.getMessage())
                .status(m.getStatus())
                .build();
    }
}
