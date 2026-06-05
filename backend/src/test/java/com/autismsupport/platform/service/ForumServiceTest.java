package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ForumCommentDto;
import com.autismsupport.platform.dto.ForumPostDto;
import com.autismsupport.platform.model.ForumComment;
import com.autismsupport.platform.model.ForumPost;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ForumCommentRepository;
import com.autismsupport.platform.repository.ForumPostRepository;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.repository.VoteRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ForumService unit testleri")
class ForumServiceTest {

    @Mock ForumPostRepository postRepository;
    @Mock ForumCommentRepository commentRepository;
    @Mock UserRepository userRepository;
    @Mock TagService tagService;
    @Mock VoteRepository voteRepository;
    @Mock NotificationService notificationService;

    @InjectMocks ForumService forumService;

    // ── getPost ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getPost: gönderi yoksa exception fırlatır")
    void getPost_notFound_throws() {
        UUID postId = UUID.randomUUID();
        when(postRepository.findByIdWithAuthorAndTags(postId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> forumService.getPost(postId, UUID.randomUUID()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("bulunamadı");
    }

    @Test
    @DisplayName("getPost: gönderi bulunursa başlık DTO'ya taşınır")
    void getPost_found_returnsDto() {
        UUID postId   = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        User author = User.builder().id(authorId).fullName("Test").email("t@t.com").build();
        ForumPost post = ForumPost.builder()
                .id(postId).title("Başlık").content("İçerik")
                .author(author).postType("DENEYIM").build();

        when(postRepository.findByIdWithAuthorAndTags(postId)).thenReturn(Optional.of(post));
        when(voteRepository.existsByUserIdAndTargetTypeAndTargetId(any(), any(), any())).thenReturn(false);

        ForumPostDto dto = forumService.getPost(postId, authorId);

        assertThat(dto.getId()).isEqualTo(postId);
        assertThat(dto.getTitle()).isEqualTo("Başlık");
    }

    // ── createPost ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("createPost: kullanıcı yoksa exception fırlatır")
    void createPost_userNotFound_throws() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        ForumPostDto req = ForumPostDto.builder()
                .title("Test").content("İçerik").category("GENEL").build();

        assertThatThrownBy(() -> forumService.createPost(req, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("bulunamadı");
    }

    @Test
    @DisplayName("createPost: postType null ise 'DENEYIM' varsayılanı kullanılır")
    void createPost_nullPostType_defaultsToDeneyim() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).fullName("Test").email("t@t.com").build();
        ForumPostDto req = ForumPostDto.builder()
                .title("Test Başlık").content("İçerik").category("GENEL")
                .postType(null).build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(postRepository.save(any(ForumPost.class))).thenAnswer(inv -> {
            ForumPost p = inv.getArgument(0);
            return ForumPost.builder().id(UUID.randomUUID())
                    .title(p.getTitle()).content(p.getContent())
                    .author(p.getAuthor()).postType(p.getPostType()).build();
        });
        when(voteRepository.existsByUserIdAndTargetTypeAndTargetId(any(), any(), any())).thenReturn(false);

        ForumPostDto result = forumService.createPost(req, userId);

        assertThat(result.getPostType()).isEqualTo("DENEYIM");
    }

    // ── createComment ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("createComment: kullanıcı yoksa exception fırlatır")
    void createComment_userNotFound_throws() {
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        ForumCommentDto dto = ForumCommentDto.builder().content("yorum").build();

        assertThatThrownBy(() -> forumService.createComment(postId, dto, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("bulunamadı");
    }

    @Test
    @DisplayName("createComment: gönderi yoksa exception fırlatır")
    void createComment_postNotFound_throws() {
        UUID postId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).fullName("T").email("t@t.com").build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(postRepository.findByIdWithAuthorAndTags(postId)).thenReturn(Optional.empty());

        ForumCommentDto dto = ForumCommentDto.builder().content("yorum").build();

        assertThatThrownBy(() -> forumService.createComment(postId, dto, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("bulunamadı");
    }

    @Test
    @DisplayName("createComment: başarılı yorum, gönderi yazarına bildirim gider")
    void createComment_notifiesPostAuthor() {
        UUID postId      = UUID.randomUUID();
        UUID authorId    = UUID.randomUUID();
        UUID commenterId = UUID.randomUUID();
        User author    = User.builder().id(authorId).fullName("Yazar").email("y@t.com")
                .role(com.autismsupport.platform.model.UserRole.PARENT).build();
        User commenter = User.builder().id(commenterId).fullName("Yorumcu").email("c@t.com")
                .role(com.autismsupport.platform.model.UserRole.PARENT).build();
        ForumPost post = ForumPost.builder().id(postId).title("T").content("C")
                .author(author).postType("DENEYIM").anonymous(false).build();
        ForumComment saved = ForumComment.builder().id(UUID.randomUUID())
                .post(post).author(commenter).content("Yorum").build();

        when(userRepository.findById(commenterId)).thenReturn(Optional.of(commenter));
        when(postRepository.findByIdWithAuthorAndTags(postId)).thenReturn(Optional.of(post));
        when(commentRepository.save(any())).thenReturn(saved);
        when(voteRepository.findByUserIdAndTargetTypeAndTargetId(any(), any(), any()))
                .thenReturn(Optional.empty());

        ForumCommentDto dto = ForumCommentDto.builder().content("Yorum").build();
        forumService.createComment(postId, dto, commenterId);

        verify(notificationService).createNotification(
                eq(authorId), any(), any(), any(), any());
    }

    // ── deletePost ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("deletePost: gönderi başkasına aitse exception fırlatır")
    void deletePost_notOwner_throws() {
        UUID postId     = UUID.randomUUID();
        UUID ownerId    = UUID.randomUUID();
        UUID intruderId = UUID.randomUUID();
        User owner = User.builder().id(ownerId).build();
        ForumPost post = ForumPost.builder().id(postId).author(owner)
                .title("T").content("C").postType("DENEYIM").build();

        when(postRepository.findByIdWithAuthorAndTags(postId)).thenReturn(Optional.of(post));

        assertThatThrownBy(() -> forumService.deletePost(postId, intruderId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("yetkiniz yok");
    }

    @Test
    @DisplayName("deletePost: gönderi sahibi kendi gönderisini silebilir")
    void deletePost_ownerCanDelete() {
        UUID postId  = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        User owner = User.builder().id(ownerId).build();
        ForumPost post = ForumPost.builder().id(postId).author(owner)
                .title("T").content("C").postType("DENEYIM").build();

        when(postRepository.findByIdWithAuthorAndTags(postId)).thenReturn(Optional.of(post));
        doNothing().when(postRepository).delete(post);

        forumService.deletePost(postId, ownerId);

        verify(postRepository).delete(post);
    }
}
