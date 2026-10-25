package com.optima.api.modules.billing.repository;

import com.optima.api.modules.billing.model.StripeEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** avisos de Stripe ya procesados */
@Repository
public interface StripeEventRepository extends JpaRepository<StripeEvent, String> {
}
