package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.VoteDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.ForumComment;
import com.autismsupport.platform.model.ForumPost;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.Vote;
import com.autismsupport.platform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VoteService {

    private static final Set<String> SUPPORTED_TARGET_TYPES = Set.of("POST", "COMMENT");

    private final VoteRepository voteRepository;
    private final UserRepository userRepository;
    private final ForumPostRepository postRepository;
    private final ForumCommentRepository commentRepository;

    @Transactional
    public VoteDto toggleVote(VoteDto dto, UUID userId) {
        String targetType = normalizeTargetType(dto.getTargetType());
        UUID targetId = dto.getTargetId();
        if (targetId == null) {
            throw new ValidationException("Oy hedefi zorunludur");
        }
        if (dto.getVoteValue() != 1 && dto.getVoteValue() != -1) {
            throw new ValidationException("Oy değeri yalnızca 1 veya -1 olabilir");
        }
        assertTargetExists(targetType, targetId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        var existing = voteRepository.findByUserIdAndTargetTypeAndTargetId(
                userId, targetType, targetId);

        if (existing.isPresent()) {
            Vote vote = existing.get();
            if (vote.getVoteValue() == dto.getVoteValue()) {
                voteRepository.delete(vote);
                updateVoteCounts(targetType, targetId);
                return VoteDto.builder()
                        .targetType(targetType)
                        .targetId(targetId)
                        .voteValue(0)
                        .build();
            } else {
                vote.setVoteValue(dto.getVoteValue());
                voteRepository.save(vote);
                updateVoteCounts(targetType, targetId);
                return VoteDto.builder()
                        .targetType(targetType)
                        .targetId(targetId)
                        .voteValue(dto.getVoteValue())
                        .build();
            }
        } else {
            Vote vote = Vote.builder()
                    .user(user)
                    .targetType(targetType)
                    .targetId(targetId)
                    .voteValue(dto.getVoteValue())
                    .build();
            voteRepository.save(vote);
            updateVoteCounts(targetType, targetId);
            return VoteDto.builder()
                    .targetType(targetType)
                    .targetId(targetId)
                    .voteValue(dto.getVoteValue())
                    .build();
        }
    }

    private void updateVoteCounts(String targetType, UUID targetId) {
        long upvotes = voteRepository.countByTargetTypeAndTargetIdAndVoteValue(targetType, targetId, 1);
        long downvotes = voteRepository.countByTargetTypeAndTargetIdAndVoteValue(targetType, targetId, -1);
        int netVotes = (int) (upvotes - downvotes);

        if ("POST".equals(targetType)) {
            postRepository.findById(targetId).ifPresent(post -> {
                post.setLikeCount((int) upvotes);
                postRepository.save(post);
            });
        } else if ("COMMENT".equals(targetType)) {
            commentRepository.findById(targetId).ifPresent(comment -> {
                comment.setVoteCount(netVotes);
                comment.setLikeCount((int) upvotes);
                commentRepository.save(comment);
            });
        }
    }

    private String normalizeTargetType(String targetType) {
        if (targetType == null || targetType.isBlank()) {
            throw new ValidationException("Oy hedef tipi zorunludur");
        }
        String normalized = targetType.trim().toUpperCase();
        if (!SUPPORTED_TARGET_TYPES.contains(normalized)) {
            throw new ValidationException("Geçersiz oy hedef tipi: " + targetType);
        }
        return normalized;
    }

    private void assertTargetExists(String targetType, UUID targetId) {
        boolean exists = "POST".equals(targetType)
                ? postRepository.existsById(targetId)
                : commentRepository.existsById(targetId);
        if (!exists) {
            throw new ResourceNotFoundException("Oy verilecek kayıt bulunamadı");
        }
    }
}
