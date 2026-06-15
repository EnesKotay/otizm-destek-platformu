package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ExpertConsultationDto;
import com.autismsupport.platform.dto.ExpertConsultationReplyDto;
import com.autismsupport.platform.model.ExpertConsultation;
import com.autismsupport.platform.model.ExpertConsultationReply;
import com.autismsupport.platform.repository.ExpertConsultationRepository;
import com.autismsupport.platform.repository.ExpertConsultationReplyRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpertConsultationService {

    private static final Set<String> VALID_STATUSES = Set.of("OPEN", "RESOLVED", "ARCHIVED");

    private final ExpertConsultationRepository consultationRepository;
    private final ExpertConsultationReplyRepository replyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public Page<ExpertConsultationDto> list(String status, String q, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        boolean hasQuery = q != null && !q.isBlank();
        boolean hasStatus = status != null && !status.isBlank() && !"all".equalsIgnoreCase(status);

        Page<ExpertConsultation> results;
        if (hasQuery) {
            results = consultationRepository.searchByQuery(
                    hasStatus ? status.toUpperCase() : null, q.trim(), pageable);
        } else if (hasStatus) {
            results = consultationRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase(), pageable);
        } else {
            results = consultationRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return results.map(c -> toDto(c, false));
    }

    public ExpertConsultationDto getDetail(UUID id) {
        ExpertConsultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Vaka bulunamadı"));
        return toDto(c, true);
    }

    @Transactional
    public ExpertConsultationDto create(UUID authorId, String title, String description, List<String> tags) {
        var author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        ExpertConsultation c = ExpertConsultation.builder()
                .author(author)
                .title(title)
                .description(description)
                .tags(tags != null ? tags : List.of())
                .status("OPEN")
                .build();
        return toDto(consultationRepository.save(c), false);
    }

    @Transactional
    public ExpertConsultationReplyDto addReply(UUID consultationId, UUID authorId, String content) {
        var consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Vaka bulunamadı"));
        var author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        ExpertConsultationReply reply = ExpertConsultationReply.builder()
                .consultation(consultation)
                .author(author)
                .content(content)
                .build();
        var saved = replyRepository.save(reply);

        UUID ownerId = consultation.getAuthor().getId();
        if (!ownerId.equals(authorId)) {
            notificationService.createNotification(
                    ownerId,
                    "CONSULTATION_REPLY",
                    "Vakana yeni görüş eklendi",
                    author.getFullName() + " vakana görüş ekledi: " + consultation.getTitle(),
                    "/uzman-odasi"
            );
        }

        return toReplyDto(saved);
    }

    @Transactional
    public ExpertConsultationDto updateStatus(UUID consultationId, UUID requesterId, String newStatus) {
        String normalized = newStatus == null ? "" : newStatus.toUpperCase();
        if (!VALID_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Geçersiz durum: " + newStatus + ". Kabul edilenler: " + VALID_STATUSES);
        }
        var c = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Vaka bulunamadı"));
        if (!c.getAuthor().getId().equals(requesterId)) {
            throw new RuntimeException("Yalnızca vaka sahibi durumu değiştirebilir");
        }
        c.setStatus(normalized);
        return toDto(consultationRepository.save(c), false);
    }

    private ExpertConsultationDto toDto(ExpertConsultation c, boolean includeReplies) {
        List<ExpertConsultationReplyDto> replies = includeReplies
                ? replyRepository.findByConsultationIdOrderByCreatedAtAsc(c.getId())
                    .stream().map(this::toReplyDto).collect(Collectors.toList())
                : null;

        return ExpertConsultationDto.builder()
                .id(c.getId())
                .authorId(c.getAuthor().getId())
                .authorName(c.getAuthor().getFullName())
                .authorTitle(c.getAuthor().getExpertTitle())
                .authorImageUrl(c.getAuthor().getProfileImageUrl())
                .title(c.getTitle())
                .description(c.getDescription())
                .tags(c.getTags())
                .status(c.getStatus())
                .replyCount(c.getReplyCount())
                .createdAt(c.getCreatedAt())
                .replies(replies)
                .build();
    }

    private ExpertConsultationReplyDto toReplyDto(ExpertConsultationReply r) {
        return ExpertConsultationReplyDto.builder()
                .id(r.getId())
                .consultationId(r.getConsultation().getId())
                .authorId(r.getAuthor().getId())
                .authorName(r.getAuthor().getFullName())
                .authorTitle(r.getAuthor().getExpertTitle())
                .authorImageUrl(r.getAuthor().getProfileImageUrl())
                .content(r.getContent())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
