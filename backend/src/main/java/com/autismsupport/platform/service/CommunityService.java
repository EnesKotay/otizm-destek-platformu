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

import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityService {
    private static final String LEGACY_ANONYMOUS_PREFIX = "[ANONYMOUS_META:true]";
    private static final String LEGACY_HIDE_CITY_PREFIX = "[HIDE_CITY_META:true]";
    private static final Set<String> ANSWER_TAGS = Set.of("Oyun", "Duyusal", "Rutin", "Eğitim", "Kriz Yönetimi");
    private static final Set<String> QUESTION_TAGS = Set.of("#oyun", "#duyusal", "#rutin", "#eğitim", "#kriz-yönetimi");
    private static final ZoneId COMMUNITY_ZONE = ZoneId.of("Europe/Istanbul");

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
        List<WeeklyQuestion> pool = weeklyQuestionRepository.findByActiveTrueOrderByPublishedAtDescSortOrderAsc();
        if (pool.isEmpty()) {
            return List.of();
        }

        List<WeeklyQuestionDto> ordered = new ArrayList<>(pool.size());
        for (int offset = 0; offset < pool.size(); offset++) {
            ordered.add(toWeeklyQuestionDto(pool.get(offset), userId, weekLabelFor(pool.get(offset), offset)));
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
                "Ailelerin kendi deneyimlerini anlatabileceği tek bir açık uçlu soru sor. " +
                "Tanı, tedavi önerisi, kesin başarı vaadi, tıbbi yönlendirme veya yüzdelik iddia üretme. " +
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
            questionText = questionText.trim();
            tagText = tagText.trim().toLowerCase(java.util.Locale.ROOT);
            String normalizedQuestion = questionText;
            if (questionText.length() > 150 || !QUESTION_TAGS.contains(tagText) ||
                    existingQuestions.stream().anyMatch(q -> q.getQuestion().trim().equalsIgnoreCase(normalizedQuestion))) {
                throw new ValidationException("Üretilen soru tekrar ediyor veya geçerli biçimde değil");
            }

            int maxSortOrder = existingQuestions.stream()
                    .mapToInt(WeeklyQuestion::getSortOrder)
                    .max()
                    .orElse(0);

            WeeklyQuestion newQuestion = WeeklyQuestion.builder()
                    .question(questionText)
                    .tag(tagText)
                    .sortOrder(maxSortOrder + 1)
                    .active(false)
                    .build();

            WeeklyQuestion saved = weeklyQuestionRepository.save(newQuestion);
            return toWeeklyQuestionDto(saved, null, "Taslak");
        } catch (Exception e) {
            log.error("Failed to generate AI weekly question", e);
            throw new RuntimeException("Yapay zeka sorusu ayrıştırılamadı: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public WeeklyQuestionDto getLatestWeeklyQuestionDraft() {
        return weeklyQuestionRepository.findFirstByActiveFalseOrderByCreatedAtDesc()
                .map(question -> toWeeklyQuestionDto(question, null, "Taslak"))
                .orElse(null);
    }

    @Transactional
    public WeeklyQuestionDto createWeeklyQuestionDraft(WeeklyQuestionDto draft) {
        String text = requireText(draft.getQuestion(), "Soru zorunludur");
        if (text.length() > 150) throw new ValidationException("Soru 150 karakteri geçemez");
        String tag = requireText(draft.getTag(), "Etiket zorunludur").toLowerCase(java.util.Locale.ROOT);
        if (!QUESTION_TAGS.contains(tag)) throw new ValidationException("Geçersiz soru etiketi");
        int nextOrder = weeklyQuestionRepository.findAll().stream()
                .mapToInt(WeeklyQuestion::getSortOrder).max().orElse(0) + 1;
        WeeklyQuestion question = weeklyQuestionRepository.save(WeeklyQuestion.builder()
                .question(text).tag(tag).sortOrder(nextOrder).active(false).build());
        return toWeeklyQuestionDto(question, null, "Taslak");
    }

    @Transactional
    public WeeklyQuestionDto publishWeeklyQuestion(UUID questionId, WeeklyQuestionDto draft) {
        WeeklyQuestion question = weeklyQuestionRepository.findById(questionId)
                .orElseThrow(() -> new ResourceNotFoundException("Soru taslağı bulunamadı"));
        if (question.isActive()) throw new ConflictException("Bu soru zaten yayımlandı");
        String text = requireText(draft.getQuestion(), "Soru zorunludur");
        if (text.length() > 150) throw new ValidationException("Soru 150 karakteri geçemez");
        String tag = requireText(draft.getTag(), "Etiket zorunludur").toLowerCase(java.util.Locale.ROOT);
        if (!QUESTION_TAGS.contains(tag)) throw new ValidationException("Geçersiz soru etiketi");
        if (weeklyQuestionRepository.findAll().stream()
                .anyMatch(other -> !other.getId().equals(questionId) && other.getQuestion().trim().equalsIgnoreCase(text))) {
            throw new ConflictException("Bu soru daha önce yayımlandı");
        }
        question.setQuestion(text);
        question.setTag(tag);
        question.setActive(true);
        question.setPublishedAt(LocalDateTime.now(COMMUNITY_ZONE));
        return toWeeklyQuestionDto(weeklyQuestionRepository.save(question), null, "Bu Hafta");
    }

    @Scheduled(cron = "0 0 0 * * MON", zone = "Europe/Istanbul")
    public void scheduleWeeklyAiQuestion() {
        log.info("Starting automated AI weekly question generation...");
        try {
            LocalDate monday = LocalDate.now(COMMUNITY_ZONE).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            if (weeklyQuestionRepository.existsByCreatedAtGreaterThanEqual(monday.atStartOfDay()) ||
                    weeklyQuestionRepository.existsByPublishedAtGreaterThanEqual(monday.atStartOfDay())) {
                log.info("A weekly question has already been published this week; skipping generation.");
                return;
            }
            generateWeeklyQuestionWithAI();
            log.info("Automated AI weekly question generated successfully.");
        } catch (Exception e) {
            log.error("Failed to execute scheduled weekly AI question generation", e);
        }
    }

    private String weekLabelFor(WeeklyQuestion question, int offset) {
        LocalDateTime publishedAt = question.getPublishedAt() != null ? question.getPublishedAt() : question.getCreatedAt();
        if (publishedAt == null) return offset == 0 ? "Son Yayımlanan" : "Önceki Soru";
        LocalDate monday = LocalDate.now(COMMUNITY_ZONE).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate published = publishedAt.toLocalDate();
        if (offset == 0) return published.isBefore(monday) ? "Son Yayımlanan" : "Bu Hafta";
        return published.isBefore(monday.minusWeeks(1)) ? "Önceki Soru" : "Geçen Hafta";
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

        String text = requireText(dto.getText(), "Cevap zorunludur");
        boolean anonymous = dto.isAnonymous();
        boolean hideCity = dto.isHideCity();
        if (text.startsWith(LEGACY_ANONYMOUS_PREFIX)) {
            anonymous = true;
            text = text.substring(LEGACY_ANONYMOUS_PREFIX.length());
        }
        if (text.startsWith(LEGACY_HIDE_CITY_PREFIX)) {
            hideCity = true;
            text = text.substring(LEGACY_HIDE_CITY_PREFIX.length());
        }
        List<String> tags = dto.getTags();
        if (text.startsWith("[TAGS:")) {
            int end = text.indexOf(']');
            if (end > 6) {
                tags = List.of(text.substring(6, end).split(","));
                text = text.substring(end + 1);
            }
        }
        text = requireText(text, "Cevap zorunludur");
        if (text.length() > 500) throw new ValidationException("Cevap 500 karakteri geçemez");
        String safeTags = tags == null ? "" : tags.stream()
                .map(String::trim).filter(ANSWER_TAGS::contains).distinct()
                .collect(Collectors.joining(","));

        WeeklyAnswer answer = WeeklyAnswer.builder()
                .question(question)
                .author(author)
                .text(text)
                .anonymous(anonymous)
                .hideCity(hideCity)
                .tags(safeTags)
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
        String text = answer.getText();
        boolean anonymous = answer.isAnonymous();
        boolean hideCity = answer.isHideCity();
        if (text.startsWith(LEGACY_ANONYMOUS_PREFIX)) {
            anonymous = true;
            text = text.substring(LEGACY_ANONYMOUS_PREFIX.length());
        }
        if (text.startsWith(LEGACY_HIDE_CITY_PREFIX)) {
            hideCity = true;
            text = text.substring(LEGACY_HIDE_CITY_PREFIX.length());
        }
        String tags = answer.getTags();
        if (text.startsWith("[TAGS:")) {
            int end = text.indexOf(']');
            if (end > 6) {
                tags = text.substring(6, end);
                text = text.substring(end + 1);
            }
        }
        return WeeklyAnswerDto.builder()
                .id(answer.getId())
                .author(anonymous ? "Bir Aile" : author != null ? author.getFullName() : "Kullanıcı")
                .city(anonymous || hideCity ? null : author != null ? author.getCity() : null)
                .authorRole(anonymous ? null : author != null && author.getRole() != null ? author.getRole().name() : null)
                .expertTitle(anonymous ? null : author != null ? author.getExpertTitle() : null)
                .anonymous(anonymous)
                .hideCity(hideCity)
                .own(author != null && userId != null && userId.equals(author.getId()))
                .tags(tags == null || tags.isBlank() ? List.of() : List.of(tags.split(",")))
                .text(text)
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
