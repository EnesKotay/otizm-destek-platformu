package com.autismsupport.platform.service;

import com.autismsupport.platform.model.EmergencyCard;
import com.autismsupport.platform.repository.EmergencyCardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmergencyCardService {

    private final EmergencyCardRepository repository;

    public String getCard(UUID childId, UUID userId) {
        return repository.findByChildIdAndUserId(childId, userId)
                .map(EmergencyCard::getData)
                .orElse(null);
    }

    public String getCardPublic(UUID childId) {
        return repository.findByChildId(childId)
                .map(EmergencyCard::getData)
                .orElse(null);
    }

    @Transactional
    public void saveCard(UUID childId, UUID userId, String dataJson) {
        EmergencyCard card = repository.findByChildIdAndUserId(childId, userId)
                .orElse(EmergencyCard.builder().childId(childId).userId(userId).build());
        card.setData(dataJson);
        repository.save(card);
    }
}
