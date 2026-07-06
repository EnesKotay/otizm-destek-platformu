package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.KnowledgeArticleDto;
import com.autismsupport.platform.model.KnowledgeArticle;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.ArticleCommentRepository;
import com.autismsupport.platform.repository.KnowledgeArticleRepository;
import com.autismsupport.platform.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("KnowledgeArticleService unit testleri")
class KnowledgeArticleServiceTest {

    @Mock KnowledgeArticleRepository articleRepository;
    @Mock UserRepository userRepository;
    @Mock ArticleCommentRepository commentRepository;

    @InjectMocks KnowledgeArticleService service;

    @Test
    @DisplayName("createArticle: kaynak adı ve URL bilgisini kaydeder")
    void createArticle_persistsSourceMetadata() {
        UUID authorId = UUID.randomUUID();
        User author = User.builder()
                .id(authorId)
                .fullName("Uzman")
                .role(UserRole.EXPERT)
                .build();
        KnowledgeArticleDto request = KnowledgeArticleDto.builder()
                .title("Makale")
                .content("İçerik")
                .category("Sağlık")
                .sourceName("American Academy of Pediatrics (AAP)")
                .sourceUrl(" https://www.aap.org/en/patient-care/autism/ ")
                .published(true)
                .build();
        when(userRepository.findById(authorId)).thenReturn(Optional.of(author));
        when(articleRepository.save(any(KnowledgeArticle.class))).thenAnswer(invocation -> invocation.getArgument(0));

        KnowledgeArticleDto result = service.createArticle(request, authorId);

        assertThat(result.getSourceName()).isEqualTo("American Academy of Pediatrics (AAP)");
        assertThat(result.getSourceUrl()).isEqualTo("https://www.aap.org/en/patient-care/autism/");
    }

    @Test
    @DisplayName("createArticle: boş kaynak alanlarını null olarak kaydeder")
    void createArticle_normalizesBlankSourceMetadataToNull() {
        UUID authorId = UUID.randomUUID();
        User author = User.builder()
                .id(authorId)
                .fullName("Uzman")
                .role(UserRole.EXPERT)
                .build();
        KnowledgeArticleDto request = KnowledgeArticleDto.builder()
                .title("Makale")
                .content("İçerik")
                .category("Genel")
                .sourceName("   ")
                .sourceUrl("")
                .build();
        when(userRepository.findById(authorId)).thenReturn(Optional.of(author));
        when(articleRepository.save(any(KnowledgeArticle.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.createArticle(request, authorId);

        ArgumentCaptor<KnowledgeArticle> articleCaptor = ArgumentCaptor.forClass(KnowledgeArticle.class);
        verify(articleRepository).save(articleCaptor.capture());
        assertThat(articleCaptor.getValue().getSourceName()).isNull();
        assertThat(articleCaptor.getValue().getSourceUrl()).isNull();
    }

    @Test
    @DisplayName("updateArticle: kaynak bilgilerini günceller")
    void updateArticle_persistsSourceMetadata() {
        UUID authorId = UUID.randomUUID();
        UUID articleId = UUID.randomUUID();
        User author = User.builder()
                .id(authorId)
                .fullName("Uzman")
                .role(UserRole.EXPERT)
                .build();
        KnowledgeArticle article = KnowledgeArticle.builder()
                .id(articleId)
                .title("Eski")
                .content("Eski içerik")
                .category("Genel")
                .author(author)
                .published(false)
                .build();
        KnowledgeArticleDto request = KnowledgeArticleDto.builder()
                .title("Yeni")
                .content("Yeni içerik")
                .category("Sağlık")
                .sourceName("American Academy of Pediatrics (AAP)")
                .sourceUrl("https://www.aap.org/en/patient-care/autism/")
                .published(true)
                .build();
        when(articleRepository.findById(articleId)).thenReturn(Optional.of(article));
        when(userRepository.findById(authorId)).thenReturn(Optional.of(author));
        when(articleRepository.save(any(KnowledgeArticle.class))).thenAnswer(invocation -> invocation.getArgument(0));

        KnowledgeArticleDto result = service.updateArticle(articleId, request, authorId);

        assertThat(result.getSourceName()).isEqualTo("American Academy of Pediatrics (AAP)");
        assertThat(result.getSourceUrl()).isEqualTo("https://www.aap.org/en/patient-care/autism/");
    }
}
