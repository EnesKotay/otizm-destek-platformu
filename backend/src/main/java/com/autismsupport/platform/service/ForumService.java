package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ForumCommentDto;
import com.autismsupport.platform.dto.ForumPostDto;
import com.autismsupport.platform.dto.TagDto;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.ForumComment;
import com.autismsupport.platform.model.ForumPost;
import com.autismsupport.platform.model.Tag;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ForumCommentRepository;
import com.autismsupport.platform.repository.ForumPostRepository;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ForumService {

    private static final Set<String> SUPPORTED_POST_TYPES = Set.of(
            "DENEYIM", "QUESTION", "TAVSIYE", "BASARI_HIKAYESI"
    );

    private final ForumPostRepository postRepository;
    private final ForumCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final TagService tagService;
    private final VoteRepository voteRepository;
    private final NotificationService notificationService;
    private final HtmlSanitizer htmlSanitizer;

    public Page<ForumPostDto> getPosts(Pageable pageable, UUID currentUserId) {
        return postRepository.findAllByOrderByPinnedDescCreatedAtDesc(pageable)
                .map(p -> toPostDto(p, currentUserId));
    }

    public Page<ForumPostDto> getPostsByCategory(String category, Pageable pageable, UUID currentUserId) {
        return postRepository.findByCategory(requireText(category, "Kategori zorunludur"), pageable)
                .map(p -> toPostDto(p, currentUserId));
    }

    public Page<ForumPostDto> getPostsByType(String postType, Pageable pageable, UUID currentUserId) {
        return postRepository.findByPostTypeOrderByPinnedDescCreatedAtDesc(normalizePostType(postType), pageable)
                .map(p -> toPostDto(p, currentUserId));
    }

    public Page<ForumPostDto> getPostsByTypeAndTags(String postType, Set<UUID> tagIds, Pageable pageable,
            UUID currentUserId) {
        if (tagIds == null || tagIds.isEmpty()) {
            return getPostsByType(postType, pageable, currentUserId);
        }
        return postRepository.findByPostTypeAndTagIds(normalizePostType(postType), tagIds, pageable)
                .map(p -> toPostDto(p, currentUserId));
    }

    public Page<ForumPostDto> getPostsByFilters(String postType, Set<UUID> tagIds, String query, String sort,
            Pageable pageable, UUID currentUserId) {
        String normalizedType = postType == null || postType.isBlank() ? null : normalizePostType(postType);
        String normalizedQuery = normalizeOptional(query);
        boolean hasQuery = normalizedQuery != null;
        String safeQuery = hasQuery ? normalizedQuery : "";
        boolean tagFilter = tagIds != null && !tagIds.isEmpty();
        Set<UUID> safeTagIds = tagFilter ? tagIds : Set.of(new UUID(0L, 0L));
        String normalizedSort = sort == null ? "new" : sort.trim().toLowerCase(Locale.ROOT);

        Page<ForumPost> page = switch (normalizedSort) {
            case "hot" -> postRepository.findByFiltersHot(normalizedType, safeQuery, hasQuery, tagFilter, safeTagIds, pageable);
            case "unanswered" -> postRepository.findUnansweredByFilters(safeQuery, hasQuery, tagFilter, safeTagIds, pageable);
            case "expert" -> postRepository.findExpertAnsweredByFilters(normalizedType, safeQuery, hasQuery, tagFilter, safeTagIds, pageable);
            default -> postRepository.findByFilters(normalizedType, safeQuery, hasQuery, tagFilter, safeTagIds, pageable);
        };

        return page.map(p -> toPostDto(p, currentUserId));
    }

    public Page<ForumPostDto> getUnansweredQuestions(Pageable pageable, UUID currentUserId) {
        return postRepository.findUnansweredQuestions(pageable)
                .map(p -> toPostDto(p, currentUserId));
    }

    public ForumPostDto getPost(UUID postId, UUID currentUserId) {
        ForumPost post = postRepository.findByIdWithAuthorAndTags(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Gönderi bulunamadı"));
        return toPostDto(post, currentUserId);
    }

    public Page<ForumPostDto> getFeaturedPosts(Pageable pageable, UUID currentUserId) {
        return postRepository.findByFeaturedTrueOrderByCreatedAtDesc(pageable)
                .map(p -> toPostDto(p, currentUserId));
    }

    @Transactional
    public ForumPostDto toggleFeatured(UUID postId, UUID currentUserId) {
        // Normally check if currentUserId is ADMIN
        ForumPost post = postRepository.findByIdWithAuthorAndTags(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Gönderi bulunamadı"));
        post.setFeatured(!post.isFeatured());
        return toPostDto(postRepository.save(post), currentUserId);
    }

    @Transactional
    public ForumPostDto createPost(ForumPostDto dto, UUID userId) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        ForumPost post = ForumPost.builder()
                .author(author)
                .title(requireText(dto.getTitle(), "Başlık zorunludur"))
                .content(sanitizeRequiredHtml(dto.getContent(), "İçerik zorunludur"))
                .category(normalizeOptional(dto.getCategory()))
                .postType(normalizePostType(dto.getPostType()))
                .privacySettings(dto.getPrivacySettings())
                .anonymous(dto.isAnonymous())
                .build();

        if (dto.getTagIds() != null && !dto.getTagIds().isEmpty()) {
            post.setTags(tagService.findTagsByIds(dto.getTagIds()));
        }

        post = postRepository.save(post);
        return toPostDto(post, userId);
    }

    @Transactional
    public ForumPostDto updatePost(UUID postId, ForumPostDto dto, UUID userId) {
        ForumPost post = postRepository.findByIdWithAuthorAndTags(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Gönderi bulunamadı"));

        if (!post.getAuthor().getId().equals(userId)) {
            throw new AccessDeniedException("Bu gönderiyi düzenleme yetkiniz yok");
        }

        post.setTitle(requireText(dto.getTitle(), "Başlık zorunludur"));
        post.setContent(sanitizeRequiredHtml(dto.getContent(), "İçerik zorunludur"));
        post.setCategory(normalizeOptional(dto.getCategory()));
        if (dto.getPostType() != null) {
            post.setPostType(normalizePostType(dto.getPostType()));
        }
        if (dto.getPrivacySettings() != null) {
            post.setPrivacySettings(dto.getPrivacySettings());
        }
        if (dto.getTagIds() != null) {
            post.setTags(tagService.findTagsByIds(dto.getTagIds()));
        }

        post = postRepository.save(post);
        return toPostDto(post, userId);
    }

    @Transactional
    public void deletePost(UUID postId, UUID userId) {
        ForumPost post = postRepository.findByIdWithAuthorAndTags(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Gönderi bulunamadı"));

        if (!post.getAuthor().getId().equals(userId)) {
            throw new AccessDeniedException("Bu gönderiyi silme yetkiniz yok");
        }

        postRepository.delete(post);
    }

    @Transactional
    public ForumPostDto acceptAnswer(UUID postId, UUID commentId, UUID userId) {
        ForumPost post = postRepository.findByIdWithAuthorAndTags(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Gönderi bulunamadı"));

        if (!post.getAuthor().getId().equals(userId)) {
            throw new AccessDeniedException("Sadece soru sahibi en iyi cevabı seçebilir");
        }
        if (!"QUESTION".equals(post.getPostType())) {
            throw new ValidationException("En iyi cevap sadece soru gönderilerinde seçilebilir");
        }

        if (post.getAcceptedAnswerId() != null) {
            commentRepository.findById(post.getAcceptedAnswerId()).ifPresent(old -> {
                old.setAccepted(false);
                commentRepository.save(old);
            });
        }

        ForumComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Yorum bulunamadı"));
        if (!comment.getPost().getId().equals(postId)) {
            throw new ValidationException("Yorum bu gönderiye ait değil");
        }
        comment.setAccepted(true);
        commentRepository.save(comment);

        post.setAcceptedAnswerId(commentId);
        post.setAnswered(true);
        post = postRepository.save(post);

        return toPostDto(post, userId);
    }

    public Page<ForumCommentDto> getComments(UUID postId, Pageable pageable, UUID currentUserId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId, pageable)
                .map(c -> toCommentDto(c, currentUserId));
    }

    @Transactional
    public ForumCommentDto createComment(UUID postId, ForumCommentDto dto, UUID userId) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
        ForumPost post = postRepository.findByIdWithAuthorAndTags(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Gönderi bulunamadı"));

        ForumComment parentComment = null;
        if (dto.getParentCommentId() != null) {
            parentComment = commentRepository.findById(dto.getParentCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Üst yorum bulunamadı"));
            if (!parentComment.getPost().getId().equals(postId)) {
                throw new ValidationException("Yanıt verilen yorum bu gönderiye ait değil");
            }
        }

        ForumComment comment = ForumComment.builder()
                .post(post)
                .author(author)
                .content(sanitizeRequiredHtml(dto.getContent(), "Yorum içeriği zorunludur"))
                .anonymous(dto.isAnonymous())
                .expertApproved(author.getRole() == com.autismsupport.platform.model.UserRole.EXPERT)
                .parentComment(parentComment)
                .build();

        comment = commentRepository.save(comment);

        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        if (!post.getAuthor().getId().equals(userId)) {
            notificationService.createNotification(
                post.getAuthor().getId(),
                "COMMENT",
                "Yeni Yorum",
                comment.isAnonymous() ? "Birileri gönderinize yorum yaptı." : author.getFullName() + " gönderinize yorum yaptı.",
                "/forum"
            );
        }

        return toCommentDto(comment, userId);
    }

    @Transactional
    public ForumCommentDto updateComment(UUID postId, UUID commentId, ForumCommentDto dto, UUID userId) {
        ForumComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Yorum bulunamadı"));
        ensureCommentBelongsToPost(comment, postId);
        if (!comment.getAuthor().getId().equals(userId)) {
            throw new AccessDeniedException("Bu yorumu düzenleme yetkiniz yok");
        }
        comment.setContent(sanitizeRequiredHtml(dto.getContent(), "Yorum içeriği zorunludur"));
        return toCommentDto(commentRepository.save(comment), userId);
    }

    @Transactional
    public void deleteComment(UUID postId, UUID commentId, UUID userId, String role) {
        ForumComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Yorum bulunamadı"));
        ensureCommentBelongsToPost(comment, postId);
        boolean isOwner = comment.getAuthor().getId().equals(userId);
        boolean isAdmin = "ADMIN".equals(role);
        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("Bu yorumu silme yetkiniz yok");
        }
        ForumPost post = comment.getPost();
        int deletedCount = deleteCommentTree(comment);
        if (post.getAcceptedAnswerId() != null && post.getAcceptedAnswerId().equals(commentId)) {
            post.setAcceptedAnswerId(null);
            post.setAnswered(false);
        }
        post.setCommentCount(Math.max(0, post.getCommentCount() - deletedCount));
        postRepository.save(post);
    }

    private int deleteCommentTree(ForumComment comment) {
        int count = 1;
        for (ForumComment reply : commentRepository.findByParentCommentId(comment.getId())) {
            count += deleteCommentTree(reply);
        }
        commentRepository.delete(comment);
        return count;
    }

    private ForumPostDto toPostDto(ForumPost post, UUID currentUserId) {
        List<TagDto> tagDtos = post.getTags() != null
                ? post.getTags().stream().map(tagService::toDto).collect(Collectors.toList())
                : new ArrayList<>();

        boolean likedByMe = currentUserId != null
                && voteRepository.existsByUserIdAndTargetTypeAndTargetId(currentUserId, "POST", post.getId());
        boolean ownedByMe = currentUserId != null && post.getAuthor() != null
                && currentUserId.equals(post.getAuthor().getId());

        return ForumPostDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .category(post.getCategory())
                .postType(post.getPostType())
                .pinned(post.isPinned())
                .featured(post.isFeatured())
                .answered(post.isAnswered())
                .acceptedAnswerId(post.getAcceptedAnswerId())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .privacySettings(post.getPrivacySettings())
                .tags(tagDtos)
                .likedByMe(likedByMe)
                .ownedByMe(ownedByMe)
                .anonymous(post.isAnonymous())
                .author(post.isAnonymous() ? 
                        UserDto.builder()
                                .fullName("Anonim Ebeveyn")
                                .profileImageUrl(null)
                                .role("PARENT")
                                .build() :
                        UserDto.builder()
                                .id(post.getAuthor().getId())
                                .fullName(post.getAuthor().getFullName())
                                .profileImageUrl(post.getAuthor().getProfileImageUrl())
                                .role(post.getAuthor().getRole().name())
                                .expertTitle(post.getAuthor().getExpertTitle())
                                .verified(post.getAuthor().isVerified())
                                .build())
                .createdAt(post.getCreatedAt())
                .build();
    }

    private ForumCommentDto toCommentDto(ForumComment comment, UUID currentUserId) {
        boolean upvotedByMe = false;
        boolean downvotedByMe = false;
        if (currentUserId != null) {
            var vote = voteRepository.findByUserIdAndTargetTypeAndTargetId(currentUserId, "COMMENT", comment.getId());
            if (vote.isPresent()) {
                upvotedByMe = vote.get().getVoteValue() == 1;
                downvotedByMe = vote.get().getVoteValue() == -1;
            }
        }

        return ForumCommentDto.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .likeCount(comment.getLikeCount())
                .voteCount(comment.getVoteCount())
                .accepted(comment.isAccepted())
                .upvotedByMe(upvotedByMe)
                .downvotedByMe(downvotedByMe)
                .anonymous(comment.isAnonymous())
                .expertApproved(comment.isExpertApproved())
                .ownedByMe(currentUserId != null && comment.getAuthor() != null && currentUserId.equals(comment.getAuthor().getId()))
                .author(comment.isAnonymous() ?
                        UserDto.builder()
                                .fullName("Anonim Ebeveyn")
                                .profileImageUrl(null)
                                .role("PARENT")
                                .build() :
                        UserDto.builder()
                                .id(comment.getAuthor().getId())
                                .fullName(comment.getAuthor().getFullName())
                                .profileImageUrl(comment.getAuthor().getProfileImageUrl())
                                .role(comment.getAuthor().getRole().name())
                                .expertTitle(comment.getAuthor().getExpertTitle())
                                .verified(comment.getAuthor().isVerified())
                                .build())
                .createdAt(comment.getCreatedAt())
                .build();
    }

    private String normalizePostType(String postType) {
        String normalized = postType == null || postType.isBlank()
                ? "DENEYIM"
                : postType.trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_POST_TYPES.contains(normalized)) {
            throw new ValidationException("Geçersiz gönderi tipi: " + postType);
        }
        return normalized;
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

    private String sanitizeRequiredHtml(String value, String message) {
        String sanitized = htmlSanitizer.sanitize(value);
        if (normalizeOptional(stripTags(sanitized)) == null) {
            throw new ValidationException(message);
        }
        return sanitized;
    }

    private String stripTags(String value) {
        return value == null ? "" : value.replaceAll("<[^>]+>", " ");
    }

    private void ensureCommentBelongsToPost(ForumComment comment, UUID postId) {
        if (!comment.getPost().getId().equals(postId)) {
            throw new ValidationException("Yorum bu gönderiye ait değil");
        }
    }
}
