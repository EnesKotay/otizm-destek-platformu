package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.PlatformSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformSettingsRepository extends JpaRepository<PlatformSettings, String> {
}
