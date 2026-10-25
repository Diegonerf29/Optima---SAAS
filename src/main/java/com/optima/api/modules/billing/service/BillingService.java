package com.optima.api.modules.billing.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.modules.billing.dto.BillingResponse;
import com.optima.api.modules.billing.model.SubscriptionStatuses;
import com.optima.api.modules.billing.service.StripeGateway.SubscriptionInfo;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.repository.BusinessRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * suscripcion de cada negocio a Optima (fase 9): prueba gratis, pago con Stripe Checkout,
 * portal del cliente y si el negocio puede usar la aplicacion
 */
@Slf4j
@Service
@Transactional
public class BillingService {

    // Stripe solo acepta un fin de prueba que quede al menos a 48 horas
    private static final Duration MIN_TRIAL_LEFT = Duration.ofHours(48);

    private final BusinessRepository businessRepository;
    private final StripeGateway stripe;
    private final Clock clock;
    private final boolean enabled;
    private final int trialDays;

    public BillingService(BusinessRepository businessRepository,
                          StripeGateway stripe,
                          Clock clock,
                          @Value("${app.billing.enabled:false}") boolean enabled,
                          @Value("${app.billing.trial-days:14}") int trialDays) {
        this.businessRepository = businessRepository;
        this.stripe = stripe;
        this.clock = clock;
        this.enabled = enabled;
        this.trialDays = trialDays;
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** empieza la prueba gratis de un negocio recien registrado, sin pedir tarjeta (9.3) */
    public void startTrial(Business business) {
        business.setSubscriptionStatus(SubscriptionStatuses.TRIALING);
        business.setTrialEndsAt(nowUtc().plusDays(trialDays));
    }

    /** si el negocio puede usar la aplicacion; con los pagos apagados, siempre (9.7) */
    public boolean hasAccess(Business business) {
        return !enabled || SubscriptionStatuses.hasAccess(
                business.getSubscriptionStatus(), business.getTrialEndsAt(), nowUtc());
    }

    @Transactional(readOnly = true)
    public BillingResponse get(Long businessId) {
        Business b = find(businessId);
        return new BillingResponse(enabled, b.getSubscriptionStatus(), toInstant(b.getTrialEndsAt()),
                toInstant(b.getCurrentPeriodEnd()), hasAccess(b), b.getStripeCustomerId() != null,
                b.getStripeSubscriptionId() != null);
    }

    /** pagina de pago de Stripe para suscribirse (9.4) */
    public String checkoutUrl(Long businessId) {
        requireEnabled();
        Business b = find(businessId);
        // con una suscripcion en marcha se gestiona desde el portal; asi no se paga dos veces
        if (b.getStripeSubscriptionId() != null && hasAccess(b)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya tienes una suscripción en marcha. Gestiónala desde \"Pagos y facturas\"");
        }
        if (b.getStripeCustomerId() == null) {
            b.setStripeCustomerId(stripe.createCustomer(b));
        }
        return stripe.createCheckoutUrl(b.getStripeCustomerId(), b.getId(), remainingTrial(b));
    }

    /** portal de Stripe: cambiar la tarjeta, ver facturas o cancelar (9.5) */
    @Transactional(readOnly = true)
    public String portalUrl(Long businessId) {
        requireEnabled();
        Business b = find(businessId);
        if (b.getStripeCustomerId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Aún no hay datos de pago: primero suscríbete");
        }
        return stripe.createPortalUrl(b.getStripeCustomerId());
    }

    /** guarda el estado actual de una suscripcion de Stripe en su negocio (lo usa el webhook) */
    public void apply(SubscriptionInfo s) {
        Business b = businessRepository.findByStripeCustomerId(s.customerId()).orElse(null);
        if (b == null) {
            // un cliente de Stripe que no es de Optima (por ejemplo, creado a mano en el panel)
            log.warn("Suscripcion {} de un cliente de Stripe sin negocio", s.id());
            return;
        }
        b.setStripeSubscriptionId(s.id());
        b.setSubscriptionStatus(SubscriptionStatuses.fromStripe(s.status()));
        if (s.trialEnd() != null) {
            b.setTrialEndsAt(toUtc(s.trialEnd()));
        }
        b.setCurrentPeriodEnd(s.currentPeriodEnd() == null ? null : toUtc(s.currentPeriodEnd()));
        log.info("Negocio {}: suscripcion {}", b.getId(), b.getSubscriptionStatus());
    }

    /** fin de la prueba que se pasa a Stripe, o null si ya no queda (o quedan menos de 48 h) */
    private Instant remainingTrial(Business b) {
        if (b.getTrialEndsAt() == null || b.getStripeSubscriptionId() != null) {
            return null;
        }
        Instant end = toInstant(b.getTrialEndsAt());
        return end.isAfter(clock.instant().plus(MIN_TRIAL_LEFT)) ? end : null;
    }

    private void requireEnabled() {
        if (!enabled) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Los pagos no están activados en este servidor");
        }
    }

    private Business find(Long businessId) {
        return businessRepository.findById(businessId)
                .orElseThrow(() -> new NotFoundException("el negocio", businessId));
    }

    private LocalDateTime nowUtc() {
        return LocalDateTime.now(clock.withZone(ZoneOffset.UTC));
    }

    private static Instant toInstant(LocalDateTime utc) {
        return utc == null ? null : utc.toInstant(ZoneOffset.UTC);
    }

    private static LocalDateTime toUtc(Instant instant) {
        return LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}
