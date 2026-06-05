package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.SimilarFamilyDto;
import com.autismsupport.platform.dto.TagDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.BuddyRelationship;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.Tag;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.BuddyRelationshipRepository;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchingService {

    private final ChildRepository childRepository;
    private final UserRepository userRepository;
    private final BuddyRelationshipRepository buddyRelationshipRepository;
    private final TagService tagService;

    private static final double TAG_WEIGHT = 0.60;
    private static final double AGE_WEIGHT = 0.20;
    private static final double THERAPY_WEIGHT = 0.10;
    private static final double EDUCATION_WEIGHT = 0.10;
    private static final int AGE_TOLERANCE_YEARS = 2;

    @Cacheable(value = "similar-families",
               key = "#childId + '-' + #parentId + '-' + #minScore + '-' + (#ageGroup ?: 'all') + '-' + #sortBy")
    @Transactional(readOnly = true)
    public List<SimilarFamilyDto> findSimilarFamilies(
            UUID childId, UUID parentId,
            double minScore, String ageGroup, String sortBy) {

        Child myChild = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));

        if (!myChild.getParent().getId().equals(parentId)) {
            throw new UnauthorizedException("Bu çocuk profiline erişim yetkiniz yok");
        }
        if (!myChild.getParent().isMatchingEnabled()) {
            return Collections.emptyList();
        }
        double normalizedMinScore = normalizeMinScore(minScore);
        String normalizedAgeGroup = normalizeAgeGroup(ageGroup);
        String normalizedSortBy = normalizeSortBy(sortBy);

        Set<UUID> myTagIds = myChild.getTags() != null
                ? myChild.getTags().stream().map(Tag::getId).collect(Collectors.toSet())
                : Collections.emptySet();

        if (myTagIds.isEmpty()) {
            return Collections.emptyList();
        }

        // Single query with JOIN FETCH — eliminates N+1
        List<Child> allChildren = childRepository.findAllWithTagsAndParentForMatching();
        List<ScoredFamily> scored = new ArrayList<>();

        for (Child other : allChildren) {
            if (other.getId().equals(childId)) continue;
            if (other.getParent().getId().equals(parentId)) continue;

            Set<UUID> otherTagIds = other.getTags() != null
                    ? other.getTags().stream().map(Tag::getId).collect(Collectors.toSet())
                    : Collections.emptySet();

            if (otherTagIds.isEmpty()) continue;

            double tagScore = jaccardSimilarity(myTagIds, otherTagIds);
            double ageScore = ageSimilarity(myChild.getBirthDate(), other.getBirthDate());
            double therapyScore = textSimilarity(myChild.getTherapies(), other.getTherapies());
            double educationScore = textSimilarity(myChild.getEducationProgram(), other.getEducationProgram());

            double totalScore = (tagScore * TAG_WEIGHT)
                    + (ageScore * AGE_WEIGHT)
                    + (therapyScore * THERAPY_WEIGHT)
                    + (educationScore * EDUCATION_WEIGHT);

            if (totalScore >= normalizedMinScore) {
                Set<UUID> commonIds = new HashSet<>(myTagIds);
                commonIds.retainAll(otherTagIds);

                List<TagDto> commonTags = other.getTags().stream()
                        .filter(t -> commonIds.contains(t.getId()))
                        .map(tagService::toDto)
                        .collect(Collectors.toList());

                scored.add(new ScoredFamily(other, totalScore, tagScore, ageScore,
                        therapyScore, educationScore, commonTags));
            }
        }

        // Sort
        Comparator<ScoredFamily> comparator = switch (normalizedSortBy) {
            case "tags"  -> Comparator.comparingInt(sf -> -sf.commonTags.size());
            case "age"   -> Comparator.comparingInt(sf ->
                               sf.child.getBirthDate() == null ? Integer.MAX_VALUE :
                               Period.between(sf.child.getBirthDate(), LocalDate.now()).getYears());
            default      -> (a, b) -> Double.compare(b.score, a.score);
        };
        scored.sort(comparator);

        return scored.stream()
                .filter(sf -> normalizedAgeGroup == null
                        || calculateAgeGroup(sf.child.getBirthDate()).equals(normalizedAgeGroup))
                .limit(20)
                .map(sf -> {
                    String ageRange = calculateAgeRange(sf.child.getBirthDate());
                    UUID otherParentId = sf.child.getParent().getId();
                    Optional<BuddyRelationship> relationship =
                            buddyRelationshipRepository.findBetweenUsers(parentId, otherParentId);

                    return SimilarFamilyDto.builder()
                            .parentId(otherParentId)
                            .parentName(sf.child.getParent().getFullName())
                            .parentCity(sf.child.getParent().getCity())
                            .childAgeRange(ageRange)
                            .commonTags(sf.commonTags)
                            .totalCommonTags(sf.commonTags.size())
                            .similarityScore(Math.round(sf.score * 100.0) / 100.0)
                            .tagScore(Math.round(sf.tagScore * 100.0) / 100.0)
                            .ageScore(Math.round(sf.ageScore * 100.0) / 100.0)
                            .therapyScore(Math.round(sf.therapyScore * 100.0) / 100.0)
                            .educationScore(Math.round(sf.educationScore * 100.0) / 100.0)
                            .relationshipStatus(relationship.map(BuddyRelationship::getStatus).orElse("NONE"))
                            .mentorRelation(relationship.map(BuddyRelationship::getIsMentorRelation).orElse(false))
                            .build();
                })
                .collect(Collectors.toList());
    }

    @CacheEvict(value = "similar-families", allEntries = true)
    @Transactional
    public boolean toggleMatching(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
        user.setMatchingEnabled(!user.isMatchingEnabled());
        return user.isMatchingEnabled();
    }

    @Transactional(readOnly = true)
    public boolean isMatchingEnabled(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"))
                .isMatchingEnabled();
    }

    private double normalizeMinScore(double minScore) {
        if (Double.isNaN(minScore) || Double.isInfinite(minScore)) {
            throw new ValidationException("Eşleşme eşiği geçersiz");
        }
        if (minScore < 0 || minScore > 1) {
            throw new ValidationException("Eşleşme eşiği 0 ile 1 arasında olmalıdır");
        }
        return minScore;
    }

    private String normalizeAgeGroup(String ageGroup) {
        if (ageGroup == null || ageGroup.isBlank()) {
            return null;
        }
        String normalized = ageGroup.trim();
        Set<String> allowed = Set.of("0-2", "3-5", "6-8", "9-12", "13-15", "16+", "unknown");
        if (!allowed.contains(normalized)) {
            throw new ValidationException("Geçersiz yaş grubu");
        }
        return normalized;
    }

    private String normalizeSortBy(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "score";
        }
        String normalized = sortBy.trim().toLowerCase(Locale.ROOT);
        if (!Set.of("score", "tags", "age").contains(normalized)) {
            throw new ValidationException("Geçersiz sıralama tipi");
        }
        return normalized;
    }

    private double jaccardSimilarity(Set<UUID> a, Set<UUID> b) {
        Set<UUID> intersection = new HashSet<>(a);
        intersection.retainAll(b);
        Set<UUID> union = new HashSet<>(a);
        union.addAll(b);
        if (union.isEmpty()) return 0;
        return (double) intersection.size() / union.size();
    }

    private double ageSimilarity(LocalDate date1, LocalDate date2) {
        if (date1 == null || date2 == null) return 0;
        int age1 = Period.between(date1, LocalDate.now()).getYears();
        int age2 = Period.between(date2, LocalDate.now()).getYears();
        int diff = Math.abs(age1 - age2);
        if (diff <= AGE_TOLERANCE_YEARS) return 1.0 - ((double) diff / (AGE_TOLERANCE_YEARS + 1));
        return 0;
    }

    private double textSimilarity(String a, String b) {
        if (a == null || b == null || a.isBlank() || b.isBlank()) return 0;
        Set<String> wordsA = Set.of(a.toLowerCase().split("[,;\\s]+"));
        Set<String> wordsB = Set.of(b.toLowerCase().split("[,;\\s]+"));
        Set<String> intersection = new HashSet<>(wordsA);
        intersection.retainAll(wordsB);
        Set<String> union = new HashSet<>(wordsA);
        union.addAll(wordsB);
        if (union.isEmpty()) return 0;
        return (double) intersection.size() / union.size();
    }

    private String calculateAgeRange(LocalDate birthDate) {
        if (birthDate == null) return "Bilinmiyor";
        int age = Period.between(birthDate, LocalDate.now()).getYears();
        if (age <= 2)  return "0-2 yaş";
        if (age <= 5)  return "3-5 yaş";
        if (age <= 8)  return "6-8 yaş";
        if (age <= 12) return "9-12 yaş";
        if (age <= 15) return "13-15 yaş";
        return "16+ yaş";
    }

    private String calculateAgeGroup(LocalDate birthDate) {
        if (birthDate == null) return "unknown";
        int age = Period.between(birthDate, LocalDate.now()).getYears();
        if (age <= 2)  return "0-2";
        if (age <= 5)  return "3-5";
        if (age <= 8)  return "6-8";
        if (age <= 12) return "9-12";
        if (age <= 15) return "13-15";
        return "16+";
    }

    private record ScoredFamily(
            Child child, double score,
            double tagScore, double ageScore,
            double therapyScore, double educationScore,
            List<TagDto> commonTags) {}
}
