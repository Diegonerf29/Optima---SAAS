package com.optima.api.modules.auth.repository;

import com.optima.api.modules.auth.model.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

/** consultas de codigos de verificacion de email */
@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    /** anula los codigos pendientes de un usuario (solo vale el ultimo enlace) */
    @Modifying
    @Query("UPDATE EmailVerificationToken t SET t.usedAt = :now WHERE t.user.id = :userId AND t.usedAt IS NULL")
    int invalidateAllForUser(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** borra los codigos caducados antes de una fecha */
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.expiresAt < :limit")
    int deleteExpiredBefore(@Param("limit") LocalDateTime limit);
}
