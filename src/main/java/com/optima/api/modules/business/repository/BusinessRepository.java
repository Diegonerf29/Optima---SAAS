package com.optima.api.modules.business.repository;

import com.optima.api.modules.business.model.Business;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** consultas de businesses */
@Repository
public interface BusinessRepository extends JpaRepository<Business, Long> {

    /** para validar unicidad del slug antes de crear */
    boolean existsBySlug(String slug);

    /** para validar unicidad del email antes de crear/actualizar */
    boolean existsByEmail(String email);

    /** negocio de un cliente de Stripe (lo usa el webhook de pagos) */
    Optional<Business> findByStripeCustomerId(String stripeCustomerId);
}
