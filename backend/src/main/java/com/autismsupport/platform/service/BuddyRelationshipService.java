package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.BuddyDto;
import com.autismsupport.platform.model.BuddyRelationship;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.BuddyRelationshipRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BuddyRelationshipService {

    private final BuddyRelationshipRepository buddyRelationshipRepository;
    private final UserRepository userRepository;
    private final MessagingService messagingService;
    private final NotificationService notificationService;

    @CacheEvict(value = "similar-families", allEntries = true)
    @Transactional
    public BuddyRelationship sendBuddyRequest(UUID requesterId, UUID receiverId, boolean isMentorRequest, String requestMessage) {
        if (requesterId.equals(receiverId)) {
            throw new RuntimeException("Kendinize eslesme istegi gonderemezsiniz.");
        }

        Optional<BuddyRelationship> existing = buddyRelationshipRepository.findBetweenUsers(requesterId, receiverId);
        if (existing.isPresent()) {
            throw new RuntimeException("Bu kullanici ile zaten bir eslesme veya isteginiz bulunuyor.");
        }

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Eslesilecek kullanici bulunamadi"));
        if (!receiver.isMatchingEnabled()) {
            throw new RuntimeException("Bu kullanici su anda eslesme isteklerine kapali.");
        }

        BuddyRelationship relation = BuddyRelationship.builder()
                .requester(requester)
                .receiver(receiver)
                .status("PENDING")
                .isMentorRelation(isMentorRequest)
                .requestMessage(sanitizeRequestMessage(requestMessage))
                .build();

        relation = buddyRelationshipRepository.save(relation);

        // Bildirim tetikle
        String notificationTitle = isMentorRequest ? "Yeni Mentorluk Talebi" : "Yeni Buddy (Eslesme) Talebi";
        String safeMessage = relation.getRequestMessage();
        String notificationBody = requester.getFullName() + (isMentorRequest
                ? " size mentorluk yapmak icin talep gonderdi." 
                : " sizinle buddy eslesmesi yapmak istiyor.")
                + (safeMessage != null && !safeMessage.isBlank() ? " Not: " + safeMessage : "");
        
        notificationService.createNotification(
                receiverId,
                "BUDDY_REQUEST",
                notificationTitle,
                notificationBody,
                "/benzer-aileler"
        );

        return relation;
    }

    @CacheEvict(value = "similar-families", allEntries = true)
    @Transactional
    public BuddyRelationship acceptBuddyRequest(UUID receiverId, UUID relationshipId) {
        BuddyRelationship relation = buddyRelationshipRepository.findById(relationshipId)
                .orElseThrow(() -> new RuntimeException("Istek bulunamadi"));

        if (!relation.getReceiver().getId().equals(receiverId)) {
            throw new RuntimeException("Bu istegi kabul etme yetkiniz yok.");
        }

        relation.setStatus("ACCEPTED");
        relation = buddyRelationshipRepository.save(relation);

        // Otomatik sohbet odasi olustur
        messagingService.getOrCreateDirectConversation(relation.getRequester().getId(), relation.getReceiver().getId());

        // Bildirim tetikle
        notificationService.createNotification(
                relation.getRequester().getId(),
                "BUDDY_ACCEPT",
                "Eslesme Talebi Kabul Edildi",
                relation.getReceiver().getFullName() + " eslesme talebinizi kabul etti! Artik mesajlasabilirsiniz.",
                "/mesajlar"
        );

        return relation;
    }

    @CacheEvict(value = "similar-families", allEntries = true)
    @Transactional
    public void rejectBuddyRequest(UUID receiverId, UUID relationshipId) {
        BuddyRelationship relation = buddyRelationshipRepository.findById(relationshipId)
                .orElseThrow(() -> new RuntimeException("Istek bulunamadi"));

        if (!relation.getReceiver().getId().equals(receiverId)) {
            throw new RuntimeException("Bu istegi reddetme yetkiniz yok.");
        }

        relation.setStatus("REJECTED");
        buddyRelationshipRepository.delete(relation);
    }

    @CacheEvict(value = "similar-families", allEntries = true)
    @Transactional
    public void removeBuddy(UUID userId, UUID relationshipId) {
        BuddyRelationship relation = buddyRelationshipRepository.findById(relationshipId)
                .orElseThrow(() -> new RuntimeException("Eslesme bulunamadi"));

        if (!relation.getRequester().getId().equals(userId) && !relation.getReceiver().getId().equals(userId)) {
            throw new RuntimeException("Bu eslesmeyi silme yetkiniz yok.");
        }

        buddyRelationshipRepository.delete(relation);
    }

    public List<BuddyDto> getMyBuddies(UUID userId) {
        List<BuddyRelationship> list = buddyRelationshipRepository.findByUserIdAndStatus(userId, "ACCEPTED");
        return list.stream().map(r -> toDto(r, userId)).toList();
    }

    public List<BuddyDto> getPendingRequests(UUID userId) {
        List<BuddyRelationship> list = buddyRelationshipRepository.findByReceiverIdAndStatus(userId, "PENDING");
        return list.stream().map(r -> toDto(r, userId)).toList();
    }

    public List<BuddyDto> getNearbyProximityBuddies(UUID userId, double maxDistanceKm) {
        double normalizedMaxDistanceKm = Math.max(1.0, Math.min(100.0, maxDistanceKm));
        User myUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));

        if (myUser.getLatitude() == null || myUser.getLongitude() == null) {
            return new ArrayList<>();
        }

        // Veritabani duzeyinde Haversine filtresi - tum tabloyu RAM'e cekmez
        List<User> candidates = userRepository.findNearbyMatchingParents(
                userId.toString(),
                myUser.getLatitude(),
                myUser.getLongitude(),
                normalizedMaxDistanceKm
        );

        // Mevcut buddy iliskisi olanlari cikar
        List<BuddyDto> nearby = new ArrayList<>();
        for (User other : candidates) {
            Optional<BuddyRelationship> rel = buddyRelationshipRepository.findBetweenUsers(userId, other.getId());
            if (rel.isPresent()) continue;

            double distance = calculateDistance(
                    myUser.getLatitude(), myUser.getLongitude(),
                    other.getLatitude(), other.getLongitude()
            );

            nearby.add(BuddyDto.builder()
                    .buddyId(other.getId())
                    .fullName(other.getFullName())
                    .city(other.getCity())
                    .profileImageUrl(other.getProfileImageUrl())
                    .latitude(other.getLatitude())
                    .longitude(other.getLongitude())
                    .distanceKm(Math.round(distance * 100.0) / 100.0)
                    .status("NONE")
                    .build());
        }

        nearby.sort((a, b) -> Double.compare(a.getDistanceKm(), b.getDistanceKm()));
        return nearby;
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private BuddyDto toDto(BuddyRelationship r, UUID currentUserId) {
        User buddy = r.getRequester().getId().equals(currentUserId) ? r.getReceiver() : r.getRequester();
        Double distance = null;
        User me = r.getRequester().getId().equals(currentUserId) ? r.getRequester() : r.getReceiver();
        
        if (me.getLatitude() != null && me.getLongitude() != null && buddy.getLatitude() != null && buddy.getLongitude() != null) {
            distance = Math.round(calculateDistance(me.getLatitude(), me.getLongitude(), buddy.getLatitude(), buddy.getLongitude()) * 100.0) / 100.0;
        }

        return BuddyDto.builder()
                .relationshipId(r.getId())
                .buddyId(buddy.getId())
                .fullName(buddy.getFullName())
                .city(buddy.getCity())
                .profileImageUrl(buddy.getProfileImageUrl())
                .latitude(buddy.getLatitude())
                .longitude(buddy.getLongitude())
                .distanceKm(distance)
                .isMentorRelation(r.getIsMentorRelation())
                .requestMessage(r.getRequestMessage())
                .status(r.getStatus())
                .build();
    }

    private String sanitizeRequestMessage(String requestMessage) {
        if (requestMessage == null || requestMessage.isBlank()) {
            return null;
        }
        String normalized = requestMessage.replaceAll("\\s+", " ").trim();
        return normalized.length() > 500 ? normalized.substring(0, 500) : normalized;
    }
}
