package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import java.net.URI;
import java.io.IOException;
import java.nio.file.*;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.io.InputStream;
import java.util.Arrays;

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
    @Value("${app.storage.type:local}") private String storageType;
    @Value("${app.storage.s3.endpoint:}") private String s3Endpoint;
    @Value("${app.storage.s3.region:auto}") private String s3Region;
    @Value("${app.storage.s3.bucket:}") private String s3Bucket;
    @Value("${app.storage.s3.access-key:}") private String s3AccessKey;
    @Value("${app.storage.s3.secret-key:}") private String s3SecretKey;
    private volatile S3Client s3Client;

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
            String normalizedOriginal = ".jpeg".equals(originalExtension) ? ".jpg" : originalExtension;
            if (!extension.equals(normalizedOriginal)) {
                throw new ValidationException("Dosya uzantısı ile içerik türü eşleşmiyor.");
            }
        }

        validateSignature(file, contentType.toLowerCase(Locale.ROOT));

        String filename = UUID.randomUUID() + extension;
        if ("s3".equalsIgnoreCase(storageType)) return storeInS3(file, filename, contentType);
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

    public Resource loadResource(String filename) {
        validateFilename(filename);
        if ("s3".equalsIgnoreCase(storageType)) {
            try {
                return new InputStreamResource(client().getObject(GetObjectRequest.builder()
                        .bucket(s3Bucket).key(filename).build()));
            } catch (Exception e) {
                throw new ValidationException("Dosya nesne deposundan okunamadı.");
            }
        }
        try {
            return new UrlResource(load(filename).toUri());
        } catch (Exception e) {
            throw new ValidationException("Dosya okunamadı.");
        }
    }

    public void delete(String filename) {
        validateFilename(filename);
        if ("s3".equalsIgnoreCase(storageType)) {
            client().deleteObject(DeleteObjectRequest.builder()
                    .bucket(s3Bucket)
                    .key(filename)
                    .build());
            return;
        }
        try {
            Files.deleteIfExists(load(filename));
        } catch (IOException e) {
            throw new IllegalStateException("Dosya silinemedi", e);
        }
    }

    private Path uploadRoot() {
        return Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    private String storeInS3(MultipartFile file, String filename, String contentType) {
        try (InputStream input = file.getInputStream()) {
            client().putObject(PutObjectRequest.builder()
                            .bucket(s3Bucket).key(filename).contentType(contentType)
                            .contentLength(file.getSize()).build(),
                    RequestBody.fromInputStream(input, file.getSize()));
            return filename;
        } catch (Exception e) {
            throw new IllegalStateException("Dosya nesne deposuna kaydedilemedi", e);
        }
    }

    private S3Client client() {
        S3Client local = s3Client;
        if (local != null) return local;
        synchronized (this) {
            if (s3Client == null) {
                if (s3Bucket.isBlank() || s3AccessKey.isBlank() || s3SecretKey.isBlank() || s3Endpoint.isBlank()) {
                    throw new IllegalStateException("S3/R2 depolama değişkenleri eksik");
                }
                s3Client = S3Client.builder()
                        .endpointOverride(URI.create(s3Endpoint))
                        .region(Region.of(s3Region))
                        .credentialsProvider(StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(s3AccessKey, s3SecretKey)))
                        .forcePathStyle(true)
                        .build();
            }
            return s3Client;
        }
    }

    private void validateFilename(String filename) {
        String normalizedFilename = Paths.get(filename).getFileName().toString();
        if (!normalizedFilename.equals(filename)) throw new ValidationException("Geçersiz dosya adı.");
    }

    private void validateSignature(MultipartFile file, String contentType) {
        try (InputStream input = file.getInputStream()) {
            byte[] header = input.readNBytes(16);
            boolean valid = switch (contentType) {
                case "image/jpeg" -> startsWith(header, new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff});
                case "image/png" -> startsWith(header, new byte[]{(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
                case "image/gif" -> startsWith(header, "GIF87a".getBytes()) || startsWith(header, "GIF89a".getBytes());
                case "image/webp" -> header.length >= 12
                        && "RIFF".equals(new String(header, 0, 4))
                        && "WEBP".equals(new String(header, 8, 4));
                case "application/pdf" -> startsWith(header, "%PDF-".getBytes());
                case "text/plain" -> Arrays.stream(toUnsigned(header)).noneMatch(value -> value == 0);
                default -> false;
            };
            if (!valid) throw new ValidationException("Dosyanın gerçek içeriği bildirilen türle eşleşmiyor.");
        } catch (IOException e) {
            throw new ValidationException("Dosya içeriği doğrulanamadı.");
        }
    }

    private boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) if (data[i] != prefix[i]) return false;
        return true;
    }

    private int[] toUnsigned(byte[] bytes) {
        int[] values = new int[bytes.length];
        for (int i = 0; i < bytes.length; i++) values[i] = Byte.toUnsignedInt(bytes[i]);
        return values;
    }
}
