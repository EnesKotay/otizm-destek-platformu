package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.SocialStoryDto;
import com.autismsupport.platform.dto.SocialStoryCommentDto;
import com.autismsupport.platform.dto.CreateSocialStoryCommentRequest;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.SocialStory;
import com.autismsupport.platform.model.SocialStoryComment;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.SocialStoryRepository;
import com.autismsupport.platform.repository.SocialStoryCommentRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SocialStoryService {

    private final SocialStoryRepository socialStoryRepository;
    private final UserRepository userRepository;
    private final ChildRepository childRepository;
    private final SocialStoryCommentRepository socialStoryCommentRepository;

    public List<SocialStoryDto> getMyStories(UUID userId) {
        return socialStoryRepository.findByAuthorIdWithDetails(userId)
                .stream().map(this::toDto).toList();
    }

    public List<SocialStoryDto> getPublicStories(String category) {
        List<SocialStory> stories = category != null && !category.isBlank()
                ? socialStoryRepository.findPublicByCategoryWithDetails(category)
                : socialStoryRepository.findPublicWithDetails();
        return stories.stream().map(this::toDto).toList();
    }

    @Transactional
    public SocialStoryDto getById(UUID id, UUID requesterId) {
        SocialStory story = socialStoryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hikaye bulunamadı"));
        if (!story.isPublic() && !story.getAuthor().getId().equals(requesterId)) {
            throw new AccessDeniedException("Bu hikayeye erişim yetkiniz yok");
        }
        socialStoryRepository.incrementViewCount(id);
        return toDto(story);
    }

    @Transactional
    public SocialStoryDto create(SocialStoryDto dto, UUID userId) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
        Child child = dto.getChildId() != null
                ? childRepository.findById(dto.getChildId()).orElse(null) : null;
        SocialStory story = SocialStory.builder()
                .author(author).title(dto.getTitle()).category(dto.getCategory())
                .description(dto.getDescription()).pages(dto.getPages() != null ? dto.getPages() : List.of())
                .isPublic(dto.isPublic()).child(child).build();
        return toDto(socialStoryRepository.save(story));
    }

    @Transactional
    public SocialStoryDto update(UUID id, SocialStoryDto dto, UUID userId) {
        SocialStory story = socialStoryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hikaye bulunamadı"));
        if (!story.getAuthor().getId().equals(userId)) {
            throw new AccessDeniedException("Bu hikayeyi düzenleme yetkiniz yok");
        }
        Child child = dto.getChildId() != null
                ? childRepository.findById(dto.getChildId()).orElse(null) : null;
        story.setTitle(dto.getTitle());
        story.setCategory(dto.getCategory());
        story.setDescription(dto.getDescription());
        story.setPages(dto.getPages());
        story.setPublic(dto.isPublic());
        story.setChild(child);
        return toDto(socialStoryRepository.save(story));
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        SocialStory story = socialStoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hikaye bulunamadı"));
        if (!story.getAuthor().getId().equals(userId)) {
            throw new AccessDeniedException("Bu hikayeyi silme yetkiniz yok");
        }
        socialStoryRepository.delete(story);
    }

    private SocialStoryDto toDto(SocialStory s) {
        return SocialStoryDto.builder()
                .id(s.getId()).authorId(s.getAuthor().getId())
                .authorName(s.getAuthor().getFullName()).title(s.getTitle())
                .category(s.getCategory()).description(s.getDescription())
                .pages(s.getPages()).isPublic(s.isPublic())
                .childId(s.getChild() != null ? s.getChild().getId() : null)
                .viewCount(s.getViewCount()).createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt()).build();
    }

    // --- Comments ---

    public List<SocialStoryCommentDto> getComments(UUID storyId) {
        return socialStoryCommentRepository.findBySocialStoryIdOrderByCreatedAtAsc(storyId)
                .stream().map(this::toCommentDto).toList();
    }

    @Transactional
    public SocialStoryCommentDto addComment(UUID storyId, CreateSocialStoryCommentRequest request, UUID userId) {
        SocialStory story = socialStoryRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Hikaye bulunamadı"));
        if (!story.isPublic() && !story.getAuthor().getId().equals(userId)) {
            throw new AccessDeniedException("Bu hikayeye yorum yapamazsınız");
        }
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
        SocialStoryComment comment = SocialStoryComment.builder()
                .socialStory(story).author(author).content(request.getContent()).build();
        return toCommentDto(socialStoryCommentRepository.save(comment));
    }

    @Transactional
    public void deleteComment(UUID commentId, UUID userId) {
        SocialStoryComment comment = socialStoryCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Yorum bulunamadı"));
        if (!comment.getAuthor().getId().equals(userId)) {
            throw new AccessDeniedException("Bu yorumu silme yetkiniz yok");
        }
        socialStoryCommentRepository.delete(comment);
    }

    private SocialStoryCommentDto toCommentDto(SocialStoryComment c) {
        return SocialStoryCommentDto.builder()
                .id(c.getId()).socialStoryId(c.getSocialStory().getId())
                .authorId(c.getAuthor().getId()).authorName(c.getAuthor().getFullName())
                .content(c.getContent()).createdAt(c.getCreatedAt()).updatedAt(c.getUpdatedAt())
                .build();
    }
}
