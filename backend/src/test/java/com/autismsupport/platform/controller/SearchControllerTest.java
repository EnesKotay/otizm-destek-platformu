package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.AiSearchResponseDto;
import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.SearchResultDto;
import com.autismsupport.platform.service.SearchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SearchController unit testleri")
class SearchControllerTest {

    @Mock
    private SearchService searchService;

    @InjectMocks
    private SearchController searchController;

    @Test
    @DisplayName("search: arama sorgusu sonuçlarını döner")
    void search_returnsResults() {
        List<SearchResultDto> mockResults = List.of(
                SearchResultDto.builder().title("Post Title").type("POST").build()
        );
        when(searchService.search("Otizm", "POST", null, null, null, null, "date")).thenReturn(mockResults);

        ResponseEntity<ApiResponse<List<SearchResultDto>>> response = searchController.search(
                "Otizm", "POST", null, null, null, null, "date"
        );

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).hasSize(1);
        assertThat(response.getBody().getData().get(0).getTitle()).isEqualTo("Post Title");
    }

    @Test
    @DisplayName("searchAi: yapay zekâ arama cevabını döner")
    void searchAi_returnsAiAnswer() {
        AiSearchResponseDto mockResponse = AiSearchResponseDto.builder()
                .answer("Yapay zeka yanıtı")
                .references(List.of())
                .build();
        when(searchService.searchAi("Otizm nedir")).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<AiSearchResponseDto>> response = searchController.searchAi("Otizm nedir");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getAnswer()).isEqualTo("Yapay zeka yanıtı");
    }
}
