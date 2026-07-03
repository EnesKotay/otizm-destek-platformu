package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.CommunityMeetupDto;
import com.autismsupport.platform.dto.WeeklyAnswerDto;
import com.autismsupport.platform.dto.WeeklyQuestionDto;
import com.autismsupport.platform.exception.AuthenticationRequiredException;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.CommunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {
    private final CommunityService communityService;

    @GetMapping("/weekly-questions")
    public ResponseEntity<ApiResponse<List<WeeklyQuestionDto>>> getWeeklyQuestions(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(communityService.getWeeklyQuestions(requireUserId(principal))));
    }

    @PostMapping("/weekly-questions/{questionId}/answers")
    public ResponseEntity<ApiResponse<WeeklyAnswerDto>> createWeeklyAnswer(
            @PathVariable UUID questionId,
            @Valid @RequestBody WeeklyAnswerDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Cevap paylaşıldı",
                communityService.createWeeklyAnswer(questionId, dto, requireUserId(principal))));
    }

    @PostMapping("/weekly-answers/{answerId}/like")
    public ResponseEntity<ApiResponse<WeeklyAnswerDto>> toggleWeeklyAnswerLike(
            @PathVariable UUID answerId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(communityService.toggleWeeklyAnswerLike(answerId, requireUserId(principal))));
    }

    @GetMapping("/meetups")
    public ResponseEntity<ApiResponse<List<CommunityMeetupDto>>> getMeetups(
            @RequestParam(required = false) String city,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(communityService.getMeetups(city, requireUserId(principal))));
    }

    @PostMapping("/meetups")
    public ResponseEntity<ApiResponse<CommunityMeetupDto>> createMeetup(
            @Valid @RequestBody CommunityMeetupDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Buluşma oluşturuldu",
                communityService.createMeetup(dto, requireUserId(principal))));
    }

    @PostMapping("/meetups/{meetupId}/attendance")
    public ResponseEntity<ApiResponse<CommunityMeetupDto>> toggleMeetupAttendance(
            @PathVariable UUID meetupId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(communityService.toggleMeetupAttendance(meetupId, requireUserId(principal))));
    }

    private UUID requireUserId(UserPrincipal principal) {
        if (principal == null) {
            throw new AuthenticationRequiredException("Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.");
        }
        return principal.getId();
    }
}
