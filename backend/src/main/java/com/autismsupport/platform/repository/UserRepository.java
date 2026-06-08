package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> lockById(@Param("id") UUID id);

    boolean existsByEmail(String email);

    List<User> findByRole(UserRole role);

    List<User> findByRoleAndVerifiedFalseOrderByCreatedAtDesc(UserRole role);

    List<User> findByRoleAndVerifiedTrue(UserRole role);

    long countByRole(UserRole role);

    long countByRoleAndVerifiedTrue(UserRole role);

    long countByRoleAndVerifiedFalse(UserRole role);

    long countByCreatedAtAfter(LocalDateTime createdAt);

    @Query("SELECT u.createdAt FROM User u WHERE u.createdAt >= :from ORDER BY u.createdAt ASC")
    List<java.time.LocalDateTime> findCreatedAtAfter(@Param("from") LocalDateTime from);

    // Gün bazında kullanıcı sayısı — DB tarafında gruplama (analytics için verimli)
    @Query(nativeQuery = true, value = """
            SELECT DATE_TRUNC('day', created_at) AS period, COUNT(*) AS cnt
            FROM users
            WHERE created_at >= :from AND created_at < :to
            GROUP BY period
            ORDER BY period ASC
            """)
    List<Object[]> countByDay(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Hafta bazında kullanıcı sayısı
    @Query(nativeQuery = true, value = """
            SELECT DATE_TRUNC('week', created_at) AS period, COUNT(*) AS cnt
            FROM users
            WHERE created_at >= :from AND created_at < :to
            GROUP BY period
            ORDER BY period ASC
            """)
    List<Object[]> countByWeek(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Ay bazında kullanıcı sayısı
    @Query(nativeQuery = true, value = """
            SELECT DATE_TRUNC('month', created_at) AS period, COUNT(*) AS cnt
            FROM users
            WHERE created_at >= :from AND created_at < :to
            GROUP BY period
            ORDER BY period ASC
            """)
    List<Object[]> countByMonth(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("""
            SELECT u
            FROM User u
            WHERE LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(COALESCE(u.expertTitle, '')) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY u.verified DESC, u.createdAt DESC
            """)
    List<User> searchByName(@Param("q") String query);

    @Query("""
            SELECT u
            FROM User u
            WHERE (:role IS NULL OR u.role = :role)
              AND (LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY u.createdAt DESC
            """)
    org.springframework.data.domain.Page<User> searchForAdminByQuery(@Param("q") String query, @Param("role") UserRole role, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<User> findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<User> findAllByRoleOrderByCreatedAtDesc(UserRole role, org.springframework.data.domain.Pageable pageable);

    @Query(nativeQuery = true, value = """
            SELECT u.* FROM users u
            WHERE u.id != CAST(:userId AS uuid)
              AND u.role = 'PARENT'
              AND u.latitude IS NOT NULL
              AND u.longitude IS NOT NULL
              AND (u.matching_enabled IS NULL OR u.matching_enabled = true)
              AND (6371 * acos(GREATEST(-1.0, LEAST(1.0,
                    cos(radians(:lat)) * cos(radians(CAST(u.latitude AS float8)))
                    * cos(radians(CAST(u.longitude AS float8)) - radians(:lon))
                    + sin(radians(:lat)) * sin(radians(CAST(u.latitude AS float8)))
                  )))) <= :maxKm
            ORDER BY (6371 * acos(GREATEST(-1.0, LEAST(1.0,
                    cos(radians(:lat)) * cos(radians(CAST(u.latitude AS float8)))
                    * cos(radians(CAST(u.longitude AS float8)) - radians(:lon))
                    + sin(radians(:lat)) * sin(radians(CAST(u.latitude AS float8)))
                  )))) ASC
            LIMIT 50
            """)
    List<User> findNearbyMatchingParents(@Param("userId") String userId,
                                         @Param("lat") double lat,
                                         @Param("lon") double lon,
                                         @Param("maxKm") double maxKm);
}
