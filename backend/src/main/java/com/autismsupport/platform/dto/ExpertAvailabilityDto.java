package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpertAvailabilityDto {

    @NotNull(message = "Gun zorunludur")
    @Min(value = 1, message = "Gun 1 ile 7 arasinda olmalidir")
    @Max(value = 7, message = "Gun 1 ile 7 arasinda olmalidir")
    private Integer dayOfWeek;

    @Builder.Default
    private Boolean enabled = false;

    private String startTime;
    private String endTime;

    @Builder.Default
    private List<String> blockedSlots = new ArrayList<>();
}
