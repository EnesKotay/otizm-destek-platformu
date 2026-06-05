package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateSocialStoryCommentRequest {
    @NotBlank(message = "Yorum içeriği boş olamaz")
    @Size(max = 1000, message = "Yorum en fazla 1000 karakter olabilir")
    private String content;
}
