package com.autismsupport.platform.repository;

import java.util.UUID;

public interface TaskCountProjection {
    UUID getChildId();
    long getTotal();
    long getCompleted();
}