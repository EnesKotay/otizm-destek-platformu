package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.TagDto;
import com.autismsupport.platform.model.Tag;
import com.autismsupport.platform.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    public List<TagDto> getAllTags() {
        return tagRepository.findAllByOrderByCategoryAscNameAsc()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public Map<String, List<TagDto>> getTagsByCategory() {
        return tagRepository.findAllByOrderByCategoryAscNameAsc()
                .stream()
                .map(this::toDto)
                .collect(Collectors.groupingBy(TagDto::getCategory));
    }

    public List<TagDto> getTagsByCategory(String category) {
        return tagRepository.findByCategory(category)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public Set<Tag> findTagsByIds(Set<UUID> ids) {
        if (ids == null || ids.isEmpty()) return new HashSet<>();
        return tagRepository.findByIdIn(ids);
    }

    public TagDto toDto(Tag tag) {
        return TagDto.builder()
                .id(tag.getId())
                .name(tag.getName())
                .category(tag.getCategory())
                .description(tag.getDescription())
                .build();
    }
}
