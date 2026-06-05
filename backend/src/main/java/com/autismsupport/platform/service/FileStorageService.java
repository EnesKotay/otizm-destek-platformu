package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Map<String, String> ALLOWED_EXTENSIONS_BY_TYPE = Map.ofEntries(
            Map.entry("image/jpeg", ".jpg"),
            Map.entry("image/png", ".png"),
            Map.entry("image/webp", ".webp"),
            Map.entry("image/gif", ".gif"),
            Map.entry("application/pdf", ".pdf"),
            Map.entry("text/plain", ".txt")
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".txt"
    );

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public String store(MultipartFile file) {
        if (file.isEmpty()) throw new ValidationException("Dosya boş olamaz");

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_EXTENSIONS_BY_TYPE.containsKey(contentType.toLowerCase(Locale.ROOT))) {
            throw new ValidationException("Bu dosya türü desteklenmiyor.");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = ALLOWED_EXTENSIONS_BY_TYPE.get(contentType.toLowerCase(Locale.ROOT));
        if (originalFilename != null && originalFilename.contains(".")) {
            String originalExtension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase(Locale.ROOT);
            if (!ALLOWED_EXTENSIONS.contains(originalExtension)) {
                throw new ValidationException("Dosya uzantısı desteklenmiyor.");
            }
            if (".jpeg".equals(originalExtension)) {
                extension = ".jpg";
            } else if (ALLOWED_EXTENSIONS_BY_TYPE.containsValue(originalExtension)) {
                extension = originalExtension;
            }
        }

        String filename = UUID.randomUUID() + extension;
        try {
            Path uploadPath = uploadRoot();
            Files.createDirectories(uploadPath);
            Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            return filename;
        } catch (IOException e) {
            throw new RuntimeException("Dosya kaydedilemedi: " + e.getMessage());
        }
    }

    public Path load(String filename) {
        String normalizedFilename = Paths.get(filename).getFileName().toString();
        if (!normalizedFilename.equals(filename)) {
            throw new ValidationException("Geçersiz dosya adı.");
        }

        Path file = uploadRoot().resolve(normalizedFilename).normalize();
        if (!file.startsWith(uploadRoot())) {
            throw new ValidationException("Geçersiz dosya yolu.");
        }
        return file;
    }

    private Path uploadRoot() {
        return Paths.get(uploadDir).toAbsolutePath().normalize();
    }
}
