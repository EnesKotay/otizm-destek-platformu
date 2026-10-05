package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ForumCommentDto {
    private UUID id;

    @NotBlank(message = "Yorum icerigi zorunludur")
    private String content;

    private UUID parentCommentId;

    private int likeCount;
    private int voteCount;
    private boolean accepted;
    private boolean anonymous;
    private boolean upvotedByMe;
    private boolean downvotedByMe;
    private boolean expertApproved;
    private boolean ownedByMe;
    private int workedCount;
    private int partialCount;
    private int notWorkedCount;
    private String outcomeByMe;
    private UserDto author;
    private LocalDateTime createdAt;
}
