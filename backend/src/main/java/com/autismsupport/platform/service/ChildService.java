package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ChildDto;
import com.autismsupport.platform.dto.TagDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.Tag;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChildService {

    private final ChildRepository childRepository;
    private final UserRepository userRepository;
    private final TagService tagService;

    @Transactional(readOnly = true)
    public List<ChildDto> getChildrenByParent(UUID parentId) {
        return childRepository.findByParentId(parentId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ChildDto getChild(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));
        validateOwnership(child, parentId);
        return toDto(child);
    }

    @Transactional
    public ChildDto createChild(ChildDto dto, UUID parentId) {
        User parent = userRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        Child child = Child.builder()
                .parent(parent)
                .name(dto.getName())
                .birthDate(dto.getBirthDate())
                .diagnosisInfo(dto.getDiagnosisInfo())
                .educationProgram(dto.getEducationProgram())
                .therapies(dto.getTherapies())
                .privacySettings(dto.getPrivacySettings())
                .build();

        if (dto.getTagIds() != null && !dto.getTagIds().isEmpty()) {
            child.setTags(tagService.findTagsByIds(dto.getTagIds()));
        }

        child = childRepository.save(child);
        return toDto(child);
    }

    @Transactional
    public ChildDto updateChild(UUID childId, ChildDto dto, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));
        validateOwnership(child, parentId);

        child.setName(dto.getName());
        child.setBirthDate(dto.getBirthDate());
        child.setDiagnosisInfo(dto.getDiagnosisInfo());
        child.setEducationProgram(dto.getEducationProgram());
        child.setTherapies(dto.getTherapies());
        if (dto.getPrivacySettings() != null) {
            child.setPrivacySettings(dto.getPrivacySettings());
        }
        if (dto.getTagIds() != null) {
            child.setTags(tagService.findTagsByIds(dto.getTagIds()));
        }

        child = childRepository.save(child);
        return toDto(child);
    }

    @Transactional
    public void deleteChild(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));
        validateOwnership(child, parentId);
        childRepository.delete(child);
    }

    private void validateOwnership(Child child, UUID parentId) {
        if (!child.getParent().getId().equals(parentId)) {
            System.err.println("OWNERSHIP FAILED! child.parent.id=" + child.getParent().getId() + ", parentId=" + parentId);
            throw new UnauthorizedException("Bu çocuk profiline erişim yetkiniz yok");
        }
    }

    private ChildDto toDto(Child child) {
        List<TagDto> tagDtos = child.getTags() != null
                ? child.getTags().stream().map(tagService::toDto).collect(Collectors.toList())
                : new ArrayList<>();

        Set<UUID> tagIds = child.getTags() != null
                ? child.getTags().stream().map(Tag::getId).collect(Collectors.toSet())
                : new HashSet<>();

        return ChildDto.builder()
                .id(child.getId())
                .name(child.getName())
                .birthDate(child.getBirthDate())
                .diagnosisInfo(child.getDiagnosisInfo())
                .educationProgram(child.getEducationProgram())
                .therapies(child.getTherapies())
                .privacySettings(child.getPrivacySettings())
                .tags(tagDtos)
                .tagIds(tagIds)
                .createdAt(child.getCreatedAt())
                .build();
    }
}
