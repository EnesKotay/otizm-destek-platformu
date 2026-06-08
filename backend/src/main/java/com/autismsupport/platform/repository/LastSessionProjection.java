package com.autismsupport.platform.repository;

import java.time.LocalDate;
import java.util.UUID;

public interface LastSessionProjection {
    UUID getChildId();
    LocalDate getLastDate();
}