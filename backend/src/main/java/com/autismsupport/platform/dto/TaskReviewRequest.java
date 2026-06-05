package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TaskReviewRequest {
    @NotBlank(message = "Geri bildirim boş olamaz")
    @Size(max = 2000, message = "Geri bildirim en fazla 2000 karakter olabilir")
    private String expertFeedback;
}
