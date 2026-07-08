package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ClinicalShareDto;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.ClinicalDataShare;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.ClinicalDataShareRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClinicalDataShareService {

    private final ClinicalDataShareRepository shareRepository;
    private final UserRepository userRepository;
    private final ChildRepository childRepository;
    private final NotificationService notificationService;

    @Transactional
    public ClinicalDataShare grantSharePermission(UUID parentId, ClinicalShareDto dto) {
        User parent = userRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("Veli bulunamadi"));
        Child child = childRepository.findById(dto.getChildId())
                .orElseThrow(() -> new RuntimeException("Cocuk profili bulunamadi"));

        if (!child.getParent().getId().equals(parentId)) {
            throw new AccessDeniedException("Bu cocugun verilerini paylasma yetkiniz yok.");
        }

        User expert = userRepository.findById(dto.getExpertId())
                .orElseThrow(() -> new RuntimeException("Paylasilacak uzman bulunamadi"));

        if (expert.getRole() != com.autismsupport.platform.model.UserRole.EXPERT && expert.getRole() != com.autismsupport.platform.model.UserRole.TEACHER) {
            throw new RuntimeException("Veriler sadece EXPERT (uzman) veya TEACHER (öğretmen) rolündeki kişilerle paylaşılabilir.");
        }

        // Zaten aktif bir paylasim varsa pasife cek
        shareRepository.findActiveShare(dto.getChildId(), dto.getExpertId()).ifPresent(s -> {
            s.setStatus("REVOKED");
            shareRepository.save(s);
        });

        ClinicalDataShare share = ClinicalDataShare.builder()
                .parent(parent)
                .child(child)
                .expert(expert)
                .shareBehaviorJournal(dto.getShareBehaviorJournal() != null && dto.getShareBehaviorJournal())
                .shareSensoryProfile(dto.getShareSensoryProfile() != null && dto.getShareSensoryProfile())
                .shareScreeningResults(dto.getShareScreeningResults() != null && dto.getShareScreeningResults())
                .shareDailyTracker(dto.getShareDailyTracker() != null && dto.getShareDailyTracker())
                .status("ACTIVE")
                .expiresAt(dto.getExpiresAt() != null ? dto.getExpiresAt() : LocalDateTime.now().plusMonths(6))
                .build();

        share = shareRepository.save(share);

        // Uzmana bildirim gonder
        notificationService.createNotification(
                dto.getExpertId(),
                "CLINICAL_SHARE",
                "Yeni Klinik Veri Paylasimi",
                parent.getFullName() + ", " + child.getName() + " isimli cocugunun gelisim verilerini sizinle paylasti.",
                "/expert/patients"
        );

        return share;
    }

    @Transactional
    public void revokeSharePermission(UUID parentId, UUID shareId) {
        ClinicalDataShare share = shareRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Paylasim kaydi bulunamadi"));

        if (share.getParent() == null || !share.getParent().getId().equals(parentId)) {
            throw new AccessDeniedException("Bu paylasim yetkisini kaldirmaya yetkiniz yok.");
        }

        share.setStatus("REVOKED");
        shareRepository.save(share);
    }

    public List<ClinicalShareDto> getMyShares(UUID parentId) {
        return shareRepository.findByParentIdAndStatus(parentId, "ACTIVE").stream()
                .map(this::toDto)
                .toList();
    }

    public List<ClinicalShareDto> getSharedPatients(UUID expertId) {
        return shareRepository.findActiveSharesForExpert(expertId).stream()
                .filter(s -> s.getExpiresAt() == null || s.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(this::toDto)
                .toList();
    }

    public boolean verifyAccess(UUID requesterId, UUID childId, String moduleName) {
        Child child = childRepository.findById(childId).orElse(null);
        if (child == null) return false;

        // Isteyen kisi cocugun velisi ise dogrudan true
        if (child.getParent().getId().equals(requesterId)) {
            return true;
        }

        // Isteyen kisi izin verilmis uzman ise
        Optional<ClinicalDataShare> shareOpt = shareRepository.findActiveShare(childId, requesterId);
        if (shareOpt.isEmpty()) return false;

        ClinicalDataShare share = shareOpt.get();
        if (share.getExpiresAt() != null && share.getExpiresAt().isBefore(LocalDateTime.now())) {
            return false;
        }

        return switch (moduleName.toLowerCase()) {
            case "behavior"  -> share.getShareBehaviorJournal();
            case "sensory"   -> share.getShareSensoryProfile();
            case "screening" -> share.getShareScreeningResults();
            case "tracker"   -> share.getShareDailyTracker();
            case "profile"   -> true;
            case "notes"     -> true;
            default          -> false;
        };
    }

    private ClinicalShareDto toDto(ClinicalDataShare s) {
        return ClinicalShareDto.builder()
                .id(s.getId())
                .childId(s.getChild().getId())
                .childName(s.getChild().getName())
                .expertId(s.getExpert().getId())
                .expertName(s.getExpert().getFullName())
                .expertTitle(s.getExpert().getExpertTitle())
                .shareBehaviorJournal(s.getShareBehaviorJournal())
                .shareSensoryProfile(s.getShareSensoryProfile())
                .shareScreeningResults(s.getShareScreeningResults())
                .shareDailyTracker(s.getShareDailyTracker())
                .status(s.getStatus())
                .expiresAt(s.getExpiresAt())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
