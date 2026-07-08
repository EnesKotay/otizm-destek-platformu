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
public class SimilarFamilyDto {
    private UUID parentId;
    private String parentName;
    private String parentCity;
    private String childName;
    private String childAgeRange;
    private List<TagDto> commonTags;
    private int totalCommonTags;
    private double similarityScore;
    private double tagScore;
    private double ageScore;
    private double therapyScore;
    private double educationScore;
    private double sensoryScore;
    private List<String> matchReasons;
    private String relationshipStatus;
    private Boolean mentorRelation;
}
