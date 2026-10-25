package com.optima.api.modules.auth.repository;

import com.optima.api.modules.auth.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

/** consultas de codigos de recuperacion guardados por huella */
@Repository
public interface PasswordResetRepository extends JpaRepository<PasswordResetToken, Long> {

    /** busca un codigo de recuperacion por su huella */
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** marca como usados todos los codigos pendientes de un usuario (solo vale el ultimo enlace) */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now WHERE t.user.id = :userId AND t.usedAt IS NULL")
    int invalidateAllForUser(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** borra los codigos caducados antes de una fecha */
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :limit")
    int deleteExpiredBefore(@Param("limit") LocalDateTime limit);
}
