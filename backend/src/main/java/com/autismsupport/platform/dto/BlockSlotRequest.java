package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class BlockSlotRequest {
    @NotNull(message = "Tarih zorunludur")
    private LocalDate date;

    @NotBlank(message = "Saat zorunludur")
    private String time;
}
