package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateGroupTitleRequest {
    @NotBlank(message = "Grup adi zorunludur")
    private String title;
}
