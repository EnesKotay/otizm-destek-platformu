package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.DataSubjectRequest;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.DataSubjectRequestRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * KVKK md. 11 başvurularını kayıt altına alır ve md. 13/2'deki otuz günlük
 * yanıt süresini takip eder. Başvurunun kaydedilmiş olması, süre içinde yanıt
 * verildiğinin ispatı için gereklidir.
 */
@Service
@RequiredArgsConstructor
public class DataSubjectRequestService {

    private static final Logger log = LoggerFactory.getLogger(DataSubjectRequestService.class);
    private static final int RESPONSE_DEADLINE_DAYS = 30;
    private static final List<DataSubjectRequest.Status> OPEN_STATUSES =
            List.of(DataSubjectRequest.Status.ACIK, DataSubjectRequest.Status.INCELENIYOR);

    private final DataSubjectRequestRepository repository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public DataSubjectRequest create(UUID userId, DataSubjectRequest.RequestType type,
                                     String description, String contactEmail) {
        if (description == null || description.isBlank()) {
            throw new ValidationException("Başvuru açıklaması boş bırakılamaz");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        String email = contactEmail == null || contactEmail.isBlank() ? user.getEmail() : contactEmail.trim();

        DataSubjectRequest request = repository.save(DataSubjectRequest.builder()
                .userId(userId)
                .requestType(type)
                .contactEmail(email)
                .description(description.trim())
                .status(DataSubjectRequest.Status.ACIK)
                .dueAt(LocalDateTime.now().plusDays(RESPONSE_DEADLINE_DAYS))
                .build());

        auditLogService.log(user, "KVKK_BASVURU_OLUSTURULDU", "DATA_SUBJECT_REQUEST", request.getId(),
                java.util.Map.of("requestType", type.name()));
        log.info("KVKK basvurusu alindi: tur={} sonTarih={}", type, request.getDueAt());
        return request;
    }

    @Transactional(readOnly = true)
    public List<DataSubjectRequest> myRequests(UUID userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<DataSubjectRequest> openRequests() {
        return repository.findByStatusInOrderByDueAtAsc(OPEN_STATUSES);
    }

    @Transactional(readOnly = true)
    public long openCount() {
        return repository.countByStatusIn(OPEN_STATUSES);
    }

    @Transactional
    public DataSubjectRequest resolve(UUID requestId, DataSubjectRequest.Status status,
                                      String response, UUID handledBy) {
        if (status == DataSubjectRequest.Status.ACIK) {
            throw new ValidationException("Başvuru 'ACIK' durumuna geri alınamaz");
        }
        DataSubjectRequest request = repository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Başvuru bulunamadı"));

        request.setStatus(status);
        request.setResponse(response);
        request.setHandledBy(handledBy);
        if (status == DataSubjectRequest.Status.TAMAMLANDI || status == DataSubjectRequest.Status.REDDEDILDI) {
            request.setResolvedAt(LocalDateTime.now());
        }
        DataSubjectRequest saved = repository.save(request);

        auditLogService.log(userRepository.findById(handledBy).orElse(null),
                "KVKK_BASVURU_SONUCLANDI", "DATA_SUBJECT_REQUEST", saved.getId(),
                java.util.Map.of("status", status.name(), "gecikmis", saved.isOverdue()));
        return saved;
    }
}
