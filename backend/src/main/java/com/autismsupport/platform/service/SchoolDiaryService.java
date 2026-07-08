package com.autismsupport.platform.service;

import com.autismsupport.platform.model.SchoolDiaryEntry;
import com.autismsupport.platform.repository.SchoolDiaryEntryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.autismsupport.platform.dto.SchoolDiaryEntryRequest;
import com.autismsupport.platform.dto.SchoolDiaryReplyRequest;

@Service
@RequiredArgsConstructor
public class SchoolDiaryService {

    private final SchoolDiaryEntryRepository repository;
    private final ObjectMapper objectMapper;
    private final ClinicalDataShareService clinicalDataShareService;

    public List<SchoolDiaryEntry> getEntries(UUID childId, UUID userId) {
        if (!clinicalDataShareService.verifyAccess(userId, childId, "tracker")) {
            throw new AccessDeniedException("Bu çocuğun okul günlüğü verilerine erişim izniniz bulunmuyor.");
        }
        return repository.findByChildIdOrderByDateDescCreatedAtDesc(childId);
    }

    @Transactional
    public SchoolDiaryEntry createEntry(UUID childId, UUID userId, SchoolDiaryEntryRequest request) {
        if (!clinicalDataShareService.verifyAccess(userId, childId, "tracker")) {
            throw new AccessDeniedException("Bu çocuğun okul günlüğüne giriş ekleme izniniz bulunmuyor.");
        }
        SchoolDiaryEntry entry = SchoolDiaryEntry.builder()
                .childId(childId)
                .userId(userId)
                .date(request.getDate())
                .fromRole(request.getFrom())
                .fromName(request.getFromName())
                .category(request.getCategory())
                .content(request.getContent())
                .replies("[]")
                .build();
        return repository.save(entry);
    }

    @Transactional
    public SchoolDiaryEntry addReply(UUID entryId, UUID userId, SchoolDiaryReplyRequest request) throws Exception {
        SchoolDiaryEntry entry = repository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Kayit bulunamadi"));
        if (!clinicalDataShareService.verifyAccess(userId, entry.getChildId(), "tracker")) {
            throw new AccessDeniedException("Bu çocuğun okul günlüğü girişine yanıt yazma izniniz bulunmuyor.");
        }
        List<Map<String, Object>> replies = objectMapper.readValue(entry.getReplies(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
        Map<String, Object> reply = Map.of(
                "id", UUID.randomUUID().toString(),
                "from", request.getFrom(),
                "fromName", request.getFromName(),
                "content", request.getContent(),
                "createdAt", LocalDateTime.now().toString()
        );
        replies.add(reply);
        entry.setReplies(objectMapper.writeValueAsString(replies));
        return repository.save(entry);
    }

    @Transactional
    public void deleteEntry(UUID entryId, UUID userId) {
        SchoolDiaryEntry entry = repository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Kayit bulunamadi"));
        if (!entry.getUserId().equals(userId)) throw new RuntimeException("Yetkiniz yok");
        repository.delete(entry);
    }


}
