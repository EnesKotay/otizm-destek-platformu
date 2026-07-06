package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.CommunityMeetupDto;
import com.autismsupport.platform.dto.WeeklyAnswerDto;
import com.autismsupport.platform.dto.WeeklyQuestionDto;
import com.autismsupport.platform.exception.ConflictException;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityService {
    // Monday reference point the weekly rotation counts forward from.
    private static final LocalDate WEEK_ROTATION_ANCHOR = LocalDate.of(2024, 1, 1);

    private final WeeklyQuestionRepository weeklyQuestionRepository;
    private final WeeklyAnswerRepository weeklyAnswerRepository;
    private final WeeklyAnswerLikeRepository weeklyAnswerLikeRepository;
    private final CommunityMeetupRepository meetupRepository;
    private final CommunityMeetupAttendeeRepository attendeeRepository;
    private final UserRepository userRepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<WeeklyQuestionDto> getWeeklyQuestions(UUID userId) {
        List<WeeklyQuestion> pool = weeklyQuestionRepository.findByActiveTrueOrderByCreatedAtDesc();
        if (pool.isEmpty()) {
            return List.of();
        }

        List<WeeklyQuestionDto> ordered = new ArrayList<>(pool.size());
        for (int offset = 0; offset < pool.size(); offset++) {
            ordered.add(toWeeklyQuestionDto(pool.get(offset), userId, weekLabelFor(offset)));
        }
        return ordered;
    }

    @Transactional
    public WeeklyQuestionDto generateWeeklyQuestionWithAI() {
        List<WeeklyQuestion> existingQuestions = weeklyQuestionRepository.findAll();
        String oldQuestionsText = existingQuestions.stream()
                .map(WeeklyQuestion::getQuestion)
                .collect(Collectors.joining("\n"));

        String prompt = "Otizm spektrumundaki çocukların aileleri ve uzmanlar arasındaki haftalık " +
                "tartışma paneli için yeni ve son derece destekleyici, empati dolu ve etkileşim artırıcı " +
                "bir soru ve buna uygun kısa bir hashtag/etiket üret. " +
                "Soru 150 karakteri geçmesin, samimi ve Türkçe olsun. " +
                "Dönüş formatı sadece şu ham JSON yapısında olsun, başka hiçbir açıklama veya markdown backtick bloğu içermesin: " +
                "{\"question\": \"çocuklarda uyku geçişlerinde hangi rutini uyguluyorsunuz?\", \"tag\": \"#rutin\"} " +
                "Etiket şu listeden seçilmelidir: #oyun, #duyusal, #rutin, #eğitim, #kriz-yönetimi. " +
                "Daha önce sorulan şu soruları kesinlikle tekrar etme: " + oldQuestionsText;

        String response = geminiService.sendMessage(prompt, List.of(), "Haftanın sorusu üreticisi");
        if (response == null || response.isBlank()) {
            throw new RuntimeException("Yapay zekadan yanıt alınamadı.");
        }

        // Clean markdown code blocks if any
        String cleanJson = response.trim();
        if (cleanJson.startsWith("```json")) {
            cleanJson = cleanJson.substring(7);
        } else if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.substring(3);
        }
        if (cleanJson.endsWith("```")) {
            cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
        }
        cleanJson = cleanJson.trim();

        try {
            @SuppressWarnings("unchecked")
            Map<String, String> data = objectMapper.readValue(cleanJson, Map.class);
            String questionText = data.get("question");
            String tagText = data.get("tag");

            // Set default if empty
            if (questionText == null || questionText.isBlank()) {
                questionText = "Çocuğunuzun günlük rutinlerini kolaylaştırmak için hangi görsel araçları kullanıyorsunuz?";
            }
            if (tagText == null || tagText.isBlank()) {
                tagText = "#rutin";
            }

            int maxSortOrder = existingQuestions.stream()
                    .mapToInt(WeeklyQuestion::getSortOrder)
                    .max()
                    .orElse(0);

            WeeklyQuestion newQuestion = WeeklyQuestion.builder()
                    .question(questionText)
                    .tag(tagText)
                    .sortOrder(maxSortOrder + 1)
                    .active(true)
                    .build();

            WeeklyQuestion saved = weeklyQuestionRepository.save(newQuestion);
            return toWeeklyQuestionDto(saved, null, "Bu Hafta");
        } catch (Exception e) {
            log.error("Failed to generate AI weekly question", e);
            throw new RuntimeException("Yapay zeka sorusu ayrıştırılamadı: " + e.getMessage());
        }
    }

    @Scheduled(cron = "0 0 0 * * MON")
    public void scheduleWeeklyAiQuestion() {
        log.info("Starting automated AI weekly question generation...");
        try {
            generateWeeklyQuestionWithAI();
            log.info("Automated AI weekly question generated successfully.");
        } catch (Exception e) {
            log.error("Failed to execute scheduled weekly AI question generation", e);
        }
    }

    private int currentRotationIndex(int poolSize) {
        LocalDate currentMonday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        long weeksSinceAnchor = ChronoUnit.WEEKS.between(WEEK_ROTATION_ANCHOR, currentMonday);
        return Math.floorMod(weeksSinceAnchor, poolSize);
    }

    private String weekLabelFor(int offset) {
        if (offset == 0) return "Bu Hafta";
        if (offset == 1) return "Geçen Hafta";
        return offset + " Hafta Önce";
    }

    @Transactional
    public WeeklyAnswerDto createWeeklyAnswer(UUID questionId, WeeklyAnswerDto dto, UUID userId) {
        WeeklyQuestion question = weeklyQuestionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Haftalık soru bulunamadı"));
        if (!question.isActive()) {
            throw new ResourceNotFoundException("Haftalık soru bulunamadı");
        }
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
        if (weeklyAnswerRepository.existsByQuestionIdAndAuthorId(questionId, userId)) {
            throw new ConflictException("Bu soruya zaten cevap verdiniz");
        }

        WeeklyAnswer answer = WeeklyAnswer.builder()
                .question(question)
                .author(author)
                .text(requireText(dto.getText(), "Cevap zorunludur"))
                .build();

        return toWeeklyAnswerDto(weeklyAnswerRepository.save(answer), userId);
    }

    @Transactional
    public WeeklyAnswerDto toggleWeeklyAnswerLike(UUID answerId, UUID userId) {
        WeeklyAnswer answer = weeklyAnswerRepository.findById(answerId)
                .orElseThrow(() -> new ResourceNotFoundException("Cevap bulunamadı"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        weeklyAnswerLikeRepository.findByAnswerIdAndUserId(answerId, userId)
                .ifPresentOrElse(
                        weeklyAnswerLikeRepository::delete,
                        () -> weeklyAnswerLikeRepository.save(WeeklyAnswerLike.builder()
                                .answer(answer)
                                .user(user)
                                .build())
                );
        answer.setLikeCount((int) weeklyAnswerLikeRepository.countByAnswerId(answerId));
        return toWeeklyAnswerDto(weeklyAnswerRepository.save(answer), userId);
    }

    @Transactional(readOnly = true)
    public List<CommunityMeetupDto> getMeetups(String city, UUID userId) {
        String normalizedCity = normalizeOptional(city);
        List<CommunityMeetup> meetups = normalizedCity == null || "Tümü".equalsIgnoreCase(normalizedCity)
                ? meetupRepository.findByDateGreaterThanEqualOrderByDateAscTimeAsc(LocalDate.now())
                : meetupRepository.findByCityAndDateGreaterThanEqualOrderByDateAscTimeAsc(normalizedCity, LocalDate.now());
        return meetups.stream().map(meetup -> toMeetupDto(meetup, userId)).toList();
    }

    @Transactional
    public CommunityMeetupDto createMeetup(CommunityMeetupDto dto, UUID userId) {
        User organizer = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        CommunityMeetup meetup = CommunityMeetup.builder()
                .title(requireText(dto.getTitle(), "Buluşma başlığı zorunludur"))
                .city(requireText(dto.getCity(), "Şehir zorunludur"))
                .district(normalizeOptional(dto.getDistrict()))
                .venue(normalizeOptional(dto.getVenue()))
                .date(dto.getDate())
                .time(dto.getTime())
                .description(normalizeOptional(dto.getDescription()))
                .emoji(normalizeOptional(dto.getEmoji()) == null ? "📍" : dto.getEmoji().trim())
                .organizer(organizer)
                .build();
        if (meetup.getDate() == null) {
            throw new ValidationException("Tarih zorunludur");
        }
        if (meetup.getDate().isBefore(LocalDate.now())) {
            throw new ValidationException("Geçmiş tarihli buluşma oluşturulamaz");
        }

        meetup = meetupRepository.save(meetup);
        attendeeRepository.save(CommunityMeetupAttendee.builder()
                .meetup(meetup)
                .user(organizer)
                .build());
        return toMeetupDto(meetup, userId);
    }

    @Transactional
    public CommunityMeetupDto toggleMeetupAttendance(UUID meetupId, UUID userId) {
        CommunityMeetup meetup = meetupRepository.findById(meetupId)
                .orElseThrow(() -> new ResourceNotFoundException("Buluşma bulunamadı"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        attendeeRepository.findByMeetupIdAndUserId(meetupId, userId)
                .ifPresentOrElse(
                        attendeeRepository::delete,
                        () -> attendeeRepository.save(CommunityMeetupAttendee.builder()
                                .meetup(meetup)
                                .user(user)
                                .build())
                );
        return toMeetupDto(meetup, userId);
    }

    private WeeklyQuestionDto toWeeklyQuestionDto(WeeklyQuestion question, UUID userId, String weekLabel) {
        return WeeklyQuestionDto.builder()
                .id(question.getId())
                .tag(question.getTag())
                .question(question.getQuestion())
                .weekLabel(weekLabel)
                .answers(weeklyAnswerRepository.findByQuestionIdOrderByCreatedAtDesc(question.getId()).stream()
                        .map(answer -> toWeeklyAnswerDto(answer, userId))
                        .toList())
                .build();
    }

    private WeeklyAnswerDto toWeeklyAnswerDto(WeeklyAnswer answer, UUID userId) {
        User author = answer.getAuthor();
        return WeeklyAnswerDto.builder()
                .id(answer.getId())
                .author(author != null ? author.getFullName() : "Kullanıcı")
                .city(author != null ? author.getCity() : null)
                .authorRole(author != null && author.getRole() != null ? author.getRole().name() : null)
                .expertTitle(author != null ? author.getExpertTitle() : null)
                .text(answer.getText())
                .likes(answer.getLikeCount())
                .liked(userId != null && weeklyAnswerLikeRepository.existsByAnswerIdAndUserId(answer.getId(), userId))
                .createdAt(answer.getCreatedAt())
                .build();
    }

    private CommunityMeetupDto toMeetupDto(CommunityMeetup meetup, UUID userId) {
        return CommunityMeetupDto.builder()
                .id(meetup.getId())
                .title(meetup.getTitle())
                .city(meetup.getCity())
                .district(meetup.getDistrict())
                .venue(meetup.getVenue())
                .date(meetup.getDate())
                .time(meetup.getTime())
                .description(meetup.getDescription())
                .organizer(meetup.getOrganizer() != null ? meetup.getOrganizer().getFullName() : "Kullanıcı")
                .attendees((int) attendeeRepository.countByMeetupId(meetup.getId()))
                .joined(userId != null && attendeeRepository.existsByMeetupIdAndUserId(meetup.getId(), userId))
                .emoji(meetup.getEmoji())
                .createdAt(meetup.getCreatedAt())
                .build();
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
}
