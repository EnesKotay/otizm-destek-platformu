package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiDraftResponse {
    private String title;
    private String category;
    private String content;
    /** false when the AI provider was unavailable/unconfigured and a canned template was returned instead. */
    @Builder.Default
    private boolean aiGenerated = true;
}
