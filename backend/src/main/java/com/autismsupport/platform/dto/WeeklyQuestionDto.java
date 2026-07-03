package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class WeeklyQuestionDto {
    private UUID id;
    private String tag;
    private String question;
    private String weekLabel;
    private List<WeeklyAnswerDto> answers;
}
