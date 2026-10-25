package com.optima.api.modules.billing.model;

import java.time.LocalDateTime;
import java.util.Locale;

/**
 * estados de la suscripcion de un negocio (los mismos que usa Stripe, en mayusculas)
 * TRIALING es tambien la prueba gratis que empieza al registrarse, antes de pasar por Stripe
 */
public final class SubscriptionStatuses {

    public static final String TRIALING = "TRIALING";
    public static final String ACTIVE = "ACTIVE";
    public static final String PAST_DUE = "PAST_DUE";
    public static final String CANCELED = "CANCELED";
    public static final String UNPAID = "UNPAID";
    public static final String INCOMPLETE = "INCOMPLETE";

    /**
     * si el negocio puede usar la aplicacion
     * con PAST_DUE (el cobro ha fallado) se sigue entrando mientras Stripe reintenta el pago
     */
    public static boolean hasAccess(String status, LocalDateTime trialEndsAt, LocalDateTime nowUtc) {
        return switch (status) {
            case ACTIVE, PAST_DUE -> true;
            case TRIALING -> trialEndsAt != null && nowUtc.isBefore(trialEndsAt);
            default -> false;
        };
    }

    /** "past_due" (Stripe) -> "PAST_DUE" */
    public static String fromStripe(String stripeStatus) {
        return stripeStatus == null ? INCOMPLETE : stripeStatus.toUpperCase(Locale.ROOT);
    }

    private SubscriptionStatuses() {
    }
}
