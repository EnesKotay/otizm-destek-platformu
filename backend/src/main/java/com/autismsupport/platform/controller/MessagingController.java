package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.*;
import com.autismsupport.platform.exception.AuthenticationRequiredException;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.MessagingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessagingController {

    private final MessagingService messagingService;

    // ── Konusma listesi ────────────────────────────────────────────────────────

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationDto>>> getConversations(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean archived,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                messagingService.getConversations(requireUserId(principal), search, archived)));
    }

    // ── Birebir konusma ───────────────────────────────────────────────────────

    @PostMapping("/conversations/direct/{userId}")
    public ResponseEntity<ApiResponse<ConversationDto>> getOrCreateDirect(
            @PathVariable UUID userId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                messagingService.getOrCreateDirectConversation(requireUserId(principal), userId)));
    }

    // ── Grup konusmasi olustur ─────────────────────────────────────────────────

    @PostMapping("/conversations/group")
    public ResponseEntity<ApiResponse<ConversationDto>> createGroup(
            @Valid @RequestBody CreateGroupRequest req,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                messagingService.createGroupConversation(
                        requireUserId(principal), req.getTitle(), req.getParticipantIds())));
    }

    // ── Var olan gruba ait konusmayi ac / olustur (Groups sayfasindan) ────────

    @PostMapping("/conversations/group/{groupId}")
    public ResponseEntity<ApiResponse<ConversationDto>> getOrCreateGroupConversation(
            @PathVariable UUID groupId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                messagingService.getOrCreateGroupConversation(groupId, requireUserId(principal))));
    }

    // ── Mesaj listesi ─────────────────────────────────────────────────────────

    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<ApiResponse<Page<MessageDto>>> getMessages(
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @CurrentUser UserPrincipal principal) {
        UUID userId = requireUserId(principal);
        messagingService.assertParticipant(conversationId, userId);
        Pageable pageable = PageRequest.of(normalizePage(page), normalizePageSize(size), Sort.by("sentAt").descending());
        return ResponseEntity.ok(ApiResponse.success(
                messagingService.getMessages(conversationId, userId, pageable)));
    }

    @GetMapping("/conversations/{conversationId}/search")
    public ResponseEntity<ApiResponse<Page<MessageDto>>> searchMessages(
            @PathVariable UUID conversationId,
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @CurrentUser UserPrincipal principal) {
        UUID userId = requireUserId(principal);
        messagingService.assertParticipant(conversationId, userId);
        Pageable pageable = PageRequest.of(normalizePage(page), normalizePageSize(size), Sort.by("sentAt").descending());
        return ResponseEntity.ok(ApiResponse.success(
                messagingService.searchMessages(conversationId, userId, q, pageable)));
    }

    // ── Mesaj gonder ──────────────────────────────────────────────────────────

    @PostMapping("/conversations/{conversationId}")
    public ResponseEntity<ApiResponse<MessageDto>> sendMessage(
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendMessageRequest req,
            @CurrentUser UserPrincipal principal) {
        UUID userId = requireUserId(principal);
        messagingService.assertParticipant(conversationId, userId);
        MessageDto message = messagingService.sendMessage(
                conversationId,
                userId,
                req.getContent() != null ? req.getContent() : "",
                req.getMessageType() != null ? req.getMessageType() : "TEXT",
                req.getFileUrl(),
                req.getFileName(),
                req.getFileType(),
                req.getReplyToId());
        return ResponseEntity.ok(ApiResponse.success(message));
    }

    // ── Mesaj sil ─────────────────────────────────────────────────────────────

    @DeleteMapping("/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(
            @PathVariable UUID messageId,
            @CurrentUser UserPrincipal principal) {
        messagingService.deleteMessage(messageId, requireUserId(principal));
        return ResponseEntity.ok(ApiResponse.success("Mesaj silindi", null));
    }

    // ── Okundu isaretle ──────────────────────────────────────────────────────

    @PostMapping("/conversations/{conversationId}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable UUID conversationId, @CurrentUser UserPrincipal principal) {
        messagingService.markAsRead(conversationId, requireUserId(principal));
        return ResponseEntity.ok(ApiResponse.success("Okundu olarak isaretlendi", null));
    }

    // ── Sessize al / ac ───────────────────────────────────────────────────────

    @PostMapping("/conversations/{conversationId}/mute")
    public ResponseEntity<ApiResponse<Void>> muteConversation(
            @PathVariable UUID conversationId,
            @Valid @RequestBody ToggleMuteRequest request,
            @CurrentUser UserPrincipal principal) {
        boolean muted = Boolean.TRUE.equals(request.getMuted());
        messagingService.muteConversation(conversationId, requireUserId(principal), muted);
        return ResponseEntity.ok(ApiResponse.success(muted ? "Sessize alindi" : "Ses acildi", null));
    }

    // ── Arsivle / Arsivden cikar ─────────────────────────────────────────────

    @PostMapping("/conversations/{conversationId}/archive")
    public ResponseEntity<ApiResponse<Void>> archiveConversation(
            @PathVariable UUID conversationId,
            @Valid @RequestBody ToggleArchiveRequest request,
            @CurrentUser UserPrincipal principal) {
        boolean archived = Boolean.TRUE.equals(request.getArchived());
        messagingService.archiveConversation(conversationId, requireUserId(principal), archived);
        return ResponseEntity.ok(ApiResponse.success(archived ? "Arsivlendi" : "Arsivden cikarildi", null));
    }

    // ── Emoji reaksiyon ───────────────────────────────────────────────────────

    @PostMapping("/{messageId}/react")
    public ResponseEntity<ApiResponse<MessageDto>> toggleReaction(
            @PathVariable UUID messageId,
            @Valid @RequestBody ReactionRequest request,
            @CurrentUser UserPrincipal principal) {
        String emoji = request.getEmoji();
        MessageDto updated = messagingService.toggleReaction(messageId, requireUserId(principal), emoji);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    // ── Grup uyesi ekle ───────────────────────────────────────────────────────

    @PostMapping("/conversations/{conversationId}/members/{userId}")
    public ResponseEntity<ApiResponse<ConversationDto>> addMember(
            @PathVariable UUID conversationId,
            @PathVariable UUID userId,
            @CurrentUser UserPrincipal principal) {
        ConversationDto updated = messagingService.addMember(conversationId, requireUserId(principal), userId);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    // ── Grup uyesi cikar ──────────────────────────────────────────────────────

    @DeleteMapping("/conversations/{conversationId}/members/{userId}")
    public ResponseEntity<ApiResponse<ConversationDto>> removeMember(
            @PathVariable UUID conversationId,
            @PathVariable UUID userId,
            @CurrentUser UserPrincipal principal) {
        ConversationDto updated = messagingService.removeMember(conversationId, requireUserId(principal), userId);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    // ── Grup adini guncelle ───────────────────────────────────────────────────

    @PatchMapping("/conversations/{conversationId}/title")
    public ResponseEntity<ApiResponse<ConversationDto>> updateGroupTitle(
            @PathVariable UUID conversationId,
            @Valid @RequestBody UpdateGroupTitleRequest request,
            @CurrentUser UserPrincipal principal) {
        String title = request.getTitle();
        ConversationDto updated = messagingService.updateGroupTitle(conversationId, requireUserId(principal), title);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    // ── Okunmamis mesaj sayisi ────────────────────────────────────────────────

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(messagingService.getTotalUnreadCount(requireUserId(principal))));
    }

    private UUID requireUserId(UserPrincipal principal) {
        if (principal == null) {
            throw new AuthenticationRequiredException("Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.");
        }
        return principal.getId();
    }

    private int normalizePage(int page) {
        return Math.max(page, 0);
    }

    private int normalizePageSize(int size) {
        return Math.min(Math.max(size, 1), 100);
    }
}
