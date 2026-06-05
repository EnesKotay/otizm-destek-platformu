package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpertService {

    private final UserRepository userRepository;

    @Cacheable(value = "experts")
    public List<UserDto> getExperts() {
        return userRepository.findByRole(UserRole.EXPERT).stream()
                .map(u -> UserDto.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .role(u.getRole().name())
                        .expertTitle(u.getExpertTitle())
                        .verified(u.isVerified())
                        .profileImageUrl(u.getProfileImageUrl())
                        .createdAt(u.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }
}
