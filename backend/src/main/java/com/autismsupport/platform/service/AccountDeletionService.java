package com.autismsupport.platform.service;

import com.autismsupport.platform.model.StoredFile;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.RefreshTokenRepository;
import com.autismsupport.platform.repository.StoredFileRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountDeletionService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final StoredFileRepository storedFileRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public void delete(User user) {
        List<String> filenames = storedFileRepository.findAllByOwnerId(user.getId()).stream()
                .map(StoredFile::getFilename)
                .toList();
        filenames.forEach(filename -> jdbcTemplate.update(
                "INSERT INTO storage_deletion_queue(filename) VALUES (?) ON CONFLICT (filename) DO NOTHING",
                filename));
        refreshTokenRepository.deleteByUserId(user.getId());
        userRepository.delete(user);
    }
}
