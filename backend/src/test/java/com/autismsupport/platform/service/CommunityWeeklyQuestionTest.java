package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.WeeklyAnswerDto;
import com.autismsupport.platform.dto.WeeklyQuestionDto;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.WeeklyAnswer;
import com.autismsupport.platform.model.WeeklyQuestion;
import com.autismsupport.platform.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CommunityWeeklyQuestionTest {
    @Mock WeeklyQuestionRepository weeklyQuestionRepository;
    @Mock WeeklyAnswerRepository weeklyAnswerRepository;
    @Mock WeeklyAnswerLikeRepository weeklyAnswerLikeRepository;
    @Mock CommunityMeetupRepository meetupRepository;
    @Mock CommunityMeetupAttendeeRepository attendeeRepository;
    @Mock UserRepository userRepository;
    @Mock GeminiService geminiService;
    @Mock ObjectMapper objectMapper;
    @InjectMocks CommunityService service;

    @Test
    void anonymousAnswerNeverExposesAuthorOrCity() {
        UUID questionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        WeeklyQuestion question = WeeklyQuestion.builder().id(questionId).active(true).build();
        User author = User.builder().id(userId).fullName("Özel İsim").city("İstanbul").build();
        when(weeklyQuestionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(userRepository.findById(userId)).thenReturn(Optional.of(author));
        when(weeklyAnswerRepository.save(any(WeeklyAnswer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WeeklyAnswerDto result = service.createWeeklyAnswer(questionId,
                WeeklyAnswerDto.builder().text("Kısa deneyim").anonymous(true).tags(List.of("Oyun")).build(), userId);

        assertThat(result.getAuthor()).isEqualTo("Bir Aile");
        assertThat(result.getCity()).isNull();
        assertThat(result.getExpertTitle()).isNull();
        assertThat(result.getText()).isEqualTo("Kısa deneyim");
        assertThat(result.getTags()).containsExactly("Oyun");
        assertThat(result.isOwn()).isTrue();
    }

    @Test
    void legacyAnonymousMetadataIsRedactedWhenReadingHistory() {
        UUID questionId = UUID.randomUUID();
        WeeklyQuestion question = WeeklyQuestion.builder().id(questionId).question("Soru").active(true).build();
        User author = User.builder().id(UUID.randomUUID()).fullName("Özel İsim").city("Ankara").build();
        WeeklyAnswer answer = WeeklyAnswer.builder().question(question).author(author)
                .text("[ANONYMOUS_META:true][TAGS:Oyun]Eski cevap").build();
        when(weeklyQuestionRepository.findByActiveTrueOrderByPublishedAtDescSortOrderAsc()).thenReturn(List.of(question));
        when(weeklyAnswerRepository.findByQuestionIdOrderByCreatedAtDesc(questionId)).thenReturn(List.of(answer));

        WeeklyAnswerDto result = service.getWeeklyQuestions(UUID.randomUUID()).getFirst().getAnswers().getFirst();

        assertThat(result.getAuthor()).isEqualTo("Bir Aile");
        assertThat(result.getCity()).isNull();
        assertThat(result.getText()).isEqualTo("Eski cevap");
        assertThat(result.getTags()).containsExactly("Oyun");
    }

    @Test
    void hidingCityDoesNotHideAuthor() {
        UUID questionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        WeeklyQuestion question = WeeklyQuestion.builder().id(questionId).active(true).build();
        User author = User.builder().id(userId).fullName("Görünen İsim").city("İzmir").build();
        when(weeklyQuestionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(userRepository.findById(userId)).thenReturn(Optional.of(author));
        when(weeklyAnswerRepository.save(any(WeeklyAnswer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WeeklyAnswerDto result = service.createWeeklyAnswer(questionId,
                WeeklyAnswerDto.builder().text("Yanıt").hideCity(true).build(), userId);

        assertThat(result.getAuthor()).isEqualTo("Görünen İsim");
        assertThat(result.getCity()).isNull();
    }

    @Test
    void weeklySchedulerSkipsGenerationWhenQuestionWasAlreadyPublished() {
        when(weeklyQuestionRepository.existsByCreatedAtGreaterThanEqual(any(LocalDateTime.class))).thenReturn(true);

        service.scheduleWeeklyAiQuestion();

        verifyNoInteractions(geminiService);
    }

    @Test
    void manualDraftIsNotPublishedUntilAdminReviewsIt() {
        when(weeklyQuestionRepository.findAll()).thenReturn(List.of());
        when(weeklyQuestionRepository.save(any(WeeklyQuestion.class))).thenAnswer(invocation -> {
            WeeklyQuestion question = invocation.getArgument(0);
            question.setId(UUID.randomUUID());
            return question;
        });
        WeeklyQuestionDto draft = service.createWeeklyQuestionDraft(
                WeeklyQuestionDto.builder().question("Bu hafta hangi oyunu birlikte oynadınız?").tag("#oyun").build());

        assertThat(draft.getWeekLabel()).isEqualTo("Taslak");
        assertThat(draft.getQuestion()).contains("oyunu");
        ArgumentCaptor<WeeklyQuestion> saved = ArgumentCaptor.forClass(WeeklyQuestion.class);
        verify(weeklyQuestionRepository).save(saved.capture());
        assertThat(saved.getValue().isActive()).isFalse();
    }

    @Test
    void publishingReviewedDraftRecordsPublicationTime() {
        UUID questionId = UUID.randomUUID();
        WeeklyQuestion draft = WeeklyQuestion.builder().id(questionId)
                .question("Taslak soru").tag("#oyun").active(false).build();
        when(weeklyQuestionRepository.findById(questionId)).thenReturn(Optional.of(draft));
        when(weeklyQuestionRepository.findAll()).thenReturn(List.of(draft));
        when(weeklyQuestionRepository.save(any(WeeklyQuestion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WeeklyQuestionDto result = service.publishWeeklyQuestion(questionId,
                WeeklyQuestionDto.builder().question("Birlikte hangi oyunu oynadınız?").tag("#oyun").build());

        assertThat(draft.isActive()).isTrue();
        assertThat(draft.getPublishedAt()).isNotNull();
        assertThat(result.getWeekLabel()).isEqualTo("Bu Hafta");
    }
}
