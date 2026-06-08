package com.autismsupport.platform.model;

import com.autismsupport.platform.util.StringListConverter;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "institutions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Institution {

    @Id
    @Column(length = 100)
    private String id;

    @Column(nullable = false)
    private String name;

    private String city;

    @Column(length = 50)
    private String category;

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> specialties;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String phone;

    @Column(length = 200)
    private String email;

    @Column(columnDefinition = "TEXT")
    private String website;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(name = "source_label")
    private String sourceLabel;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "sgk_contract")
    private Boolean sgkContract;

    @JsonProperty("free")
    @Column(name = "free_service")
    private Boolean freeService;

    @Column(name = "age_range", length = 50)
    private String ageRange;

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> services;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
