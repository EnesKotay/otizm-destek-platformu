package com.autismsupport.platform.service;

import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.ClinicalDataShare;
import com.autismsupport.platform.model.SharedProgressNote;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.ClinicalDataShareRepository;
import com.autismsupport.platform.repository.SharedProgressNoteRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.LinkedHashMap;
import com.autismsupport.platform.dto.SharedProgressNoteRequest;

@Service
@RequiredArgsConstructor
public class SharedProgressService {

    private final SharedProgressNoteRepository repository;
    private final ObjectMapper objectMapper;
    private final ChildRepository childRepository;
    private final ClinicalDataShareRepository shareRepository;

    public void verifySharedProgressAccess(UUID childId, UUID userId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Çocuk profili bulunamadı"));

        if (child.getParent().getId().equals(userId)) {
            return;
        }

        ClinicalDataShare share = shareRepository.findActiveShare(childId, userId)
                .orElseThrow(() -> new AccessDeniedException("Bu çocuğun verilerine erişim yetkiniz yok."));

        if (share.getExpiresAt() != null && share.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new AccessDeniedException("Bu veri paylaşımının süresi dolmuş.");
        }
    }

    public List<SharedProgressNote> getNotes(UUID childId, UUID userId) {
        verifySharedProgressAccess(childId, userId);
        return repository.findByChildIdOrderByCreatedAtDesc(childId);
    }

    @Transactional
    public SharedProgressNote createNote(UUID childId, UUID userId, SharedProgressNoteRequest request) {
        verifySharedProgressAccess(childId, userId);
        SharedProgressNote note = SharedProgressNote.builder()
                .childId(childId)
                .userId(userId)
                .fromRole(request.getFromRole())
                .fromName(request.getFromName())
                .type(request.getType())
                .title(request.getTitle())
                .content(request.getContent())
                .status("open")
                .dueDate(request.getDueDate())
                .expertId(request.getExpertId() != null && !request.getExpertId().isBlank()
                        ? UUID.fromString(request.getExpertId()) : null)
                .replies("[]")
                .build();
        return repository.save(note);
    }

    @Transactional
    public SharedProgressNote updateStatus(UUID noteId, UUID userId, String status) {
        SharedProgressNote note = repository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Not bulunamadi"));
        verifySharedProgressAccess(note.getChildId(), userId);
        note.setStatus(status);
        if ("done".equals(status)) note.setCompletedAt(LocalDateTime.now());
        return repository.save(note);
    }

    @Transactional
    public SharedProgressNote addReply(UUID noteId, UUID userId, String fromRole, String fromName, String content) throws Exception {
        SharedProgressNote note = repository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Not bulunamadi"));
        verifySharedProgressAccess(note.getChildId(), userId);
        List<Map<String, Object>> replies = objectMapper.readValue(note.getReplies(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
        Map<String, Object> reply = Map.of(
                "id", UUID.randomUUID().toString(),
                "fromRole", fromRole,
                "fromName", fromName,
                "content", content,
                "createdAt", LocalDateTime.now().toString()
        );
        replies.add(reply);
        note.setReplies(objectMapper.writeValueAsString(replies));
        return repository.save(note);
    }

    @Transactional
    public SharedProgressNote updateNote(UUID noteId, UUID userId, SharedProgressNoteRequest request) {
        SharedProgressNote note = repository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Not bulunamadi"));
        verifySharedProgressAccess(note.getChildId(), userId);
        if (!note.getUserId().equals(userId)) {
            throw new AccessDeniedException("Yalnizca notu olusturan kisi duzenleyebilir.");
        }
        if (request.getTitle() != null) note.setTitle(request.getTitle());
        if (request.getContent() != null) note.setContent(request.getContent());
        if (request.getStatus() != null) {
            note.setStatus(request.getStatus());
            if ("done".equals(request.getStatus())) note.setCompletedAt(LocalDateTime.now());
        }
        if (request.getDueDate() != null) note.setDueDate(request.getDueDate());
        return repository.save(note);
    }

    @Transactional
    public void deleteNote(UUID noteId, UUID userId) {
        SharedProgressNote note = repository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Not bulunamadi"));
        verifySharedProgressAccess(note.getChildId(), userId);
        if (!note.getUserId().equals(userId)) throw new RuntimeException("Yetkiniz yok");
        repository.delete(note);
    }

    public Map<String, Object> getTrend(UUID childId, UUID userId) {
        verifySharedProgressAccess(childId, userId);
        LocalDateTime eightWeeksAgo = LocalDateTime.now().minusWeeks(8);
        List<SharedProgressNote> notes = repository
                .findByChildIdAndCreatedAtAfterOrderByCreatedAtAsc(childId, eightWeeksAgo);

        // Haftalik grupla
        DateTimeFormatter weekFmt = DateTimeFormatter.ofPattern("dd MMM", java.util.Locale.forLanguageTag("tr"));
        List<Map<String, Object>> weekly = new ArrayList<>();
        for (int i = 7; i >= 0; i--) {
            LocalDateTime weekStart = LocalDateTime.now().minusWeeks(i).with(java.time.DayOfWeek.MONDAY)
                    .withHour(0).withMinute(0).withSecond(0);
            LocalDateTime weekEnd = weekStart.plusWeeks(1);
            String label = weekStart.format(weekFmt);

            long total = notes.stream()
                    .filter(n -> !n.getCreatedAt().isBefore(weekStart) && n.getCreatedAt().isBefore(weekEnd))
                    .count();
            long done = notes.stream()
                    .filter(n -> !n.getCreatedAt().isBefore(weekStart) && n.getCreatedAt().isBefore(weekEnd)
                            && "done".equals(n.getStatus()))
                    .count();

            Map<String, Object> week = new LinkedHashMap<>();
            week.put("label", label);
            week.put("total", total);
            week.put("done", done);
            weekly.add(week);
        }

        // Genel ozet istatistikler
        long totalCount = repository.countByChildIdAndStatus(childId, "open")
                + repository.countByChildIdAndStatus(childId, "in_progress")
                + repository.countByChildIdAndStatus(childId, "done");
        long doneCount = repository.countByChildIdAndStatus(childId, "done");
        long openCount = repository.countByChildIdAndStatus(childId, "open");
        long inProgressCount = repository.countByChildIdAndStatus(childId, "in_progress");

        // Tip bazli dagilim
        Map<String, Long> byType = Map.of(
                "observation", repository.countByChildIdAndType(childId, "observation"),
                "homework", repository.countByChildIdAndType(childId, "homework"),
                "goal", repository.countByChildIdAndType(childId, "goal"),
                "feedback", repository.countByChildIdAndType(childId, "feedback"),
                "general", repository.countByChildIdAndType(childId, "general")
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("weekly", weekly);
        result.put("totalCount", totalCount);
        result.put("doneCount", doneCount);
        result.put("openCount", openCount);
        result.put("inProgressCount", inProgressCount);
        result.put("completionRate", totalCount > 0 ? Math.round((double) doneCount / totalCount * 100.0) : 0);
        result.put("byType", byType);
        return result;
    }


}
