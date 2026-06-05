package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class CreateGroupRequest {
    @NotBlank(message = "Grup basligi bos olamaz")
    private String title;

    @NotEmpty(message = "Katilimci listesi bos olamaz")
    private List<UUID> participantIds;
}
