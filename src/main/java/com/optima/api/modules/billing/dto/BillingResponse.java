package com.optima.api.modules.billing.dto;

import java.time.Instant;

/**
 * estado de la suscripcion del negocio
 * enabled = false: los pagos estan apagados (desarrollo, demo) y no se bloquea nada
 * hasAccess: si el negocio puede usar la aplicacion ahora mismo
 * hasPaymentAccount: si ya existe su cliente en Stripe (se puede abrir el portal)
 * hasSubscription: si ya se ha suscrito (aunque siga en la prueba: el primer cobro llega al acabarla)
 */
public record BillingResponse(
        boolean enabled,
        String status,
        Instant trialEndsAt,
        Instant currentPeriodEnd,
        boolean hasAccess,
        boolean hasPaymentAccount,
        boolean hasSubscription
) {
}
