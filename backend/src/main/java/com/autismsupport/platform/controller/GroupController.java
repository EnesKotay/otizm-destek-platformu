package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.GroupDto;
import com.autismsupport.platform.dto.GroupMeetingDto;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.exception.AuthenticationRequiredException;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<GroupDto>>> getMyGroups(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(groupService.getMyGroups(requireUserId(principal))));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<GroupDto>>> searchGroups(
            @RequestParam(defaultValue = "") String query, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(groupService.searchGroups(query, requireUserId(principal))));
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<List<GroupDto>>> getByCategory(
            @PathVariable String category, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(groupService.getGroupsByCategory(category, requireUserId(principal))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<GroupDto>> createGroup(
            @Valid @RequestBody GroupDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Grup olusturuldu", groupService.createGroup(dto, requireUserId(principal))));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<ApiResponse<Void>> joinGroup(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        groupService.joinGroup(id, requireUserId(principal));
        return ResponseEntity.ok(ApiResponse.success("Gruba katildiniz", null));
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        groupService.leaveGroup(id, requireUserId(principal));
        return ResponseEntity.ok(ApiResponse.success("Gruptan ayrildiniz", null));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<GroupDto>> updateGroup(
            @PathVariable UUID id, @Valid @RequestBody GroupDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Grup guncellendi", groupService.updateGroup(id, dto, requireUserId(principal))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        groupService.deleteGroup(id, requireUserId(principal), principal.getRole());
        return ResponseEntity.ok(ApiResponse.success("Grup silindi", null));
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<ApiResponse<GroupDto>> toggleVerification(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Grup dogrulama durumu guncellendi", groupService.toggleVerification(id, requireUserId(principal), principal.getRole())));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<ApiResponse<List<UserDto>>> getGroupMembers(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(groupService.getGroupMembers(id, requireUserId(principal))));
    }

    @GetMapping("/{id}/meetings")
    public ResponseEntity<ApiResponse<List<GroupMeetingDto>>> getMeetings(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(groupService.getMeetings(id, requireUserId(principal))));
    }

    @PostMapping("/{id}/meetings")
    public ResponseEntity<ApiResponse<GroupMeetingDto>> createMeeting(
            @PathVariable UUID id, @Valid @RequestBody GroupMeetingDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Bulusma planlandi", groupService.createMeeting(id, dto, requireUserId(principal))));
    }

    @DeleteMapping("/{id}/meetings/{meetingId}")
    public ResponseEntity<ApiResponse<Void>> deleteMeeting(
            @PathVariable UUID id, @PathVariable UUID meetingId, @CurrentUser UserPrincipal principal) {
        groupService.deleteMeeting(id, meetingId, requireUserId(principal));
        return ResponseEntity.ok(ApiResponse.success("Bulusma iptal edildi", null));
    }

    private UUID requireUserId(UserPrincipal principal) {
        if (principal == null) {
            throw new AuthenticationRequiredException("Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.");
        }
        return principal.getId();
    }
}
