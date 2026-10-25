package com.optima.api.modules.billing.service;

import com.optima.api.modules.business.model.Business;

import java.time.Instant;

/**
 * todo lo que Optima le pide a Stripe, en un solo sitio
 * la implementacion real es StripeSdkGateway; en los tests se sustituye por un doble
 * para no llamar a Stripe de verdad
 */
public interface StripeGateway {

    /** crea el cliente de Stripe del negocio y devuelve su id (cus_...) */
    String createCustomer(Business business);

    /**
     * crea una pagina de pago de Stripe Checkout para suscribirse y devuelve su direccion
     * trialEnd: hasta cuando sigue la prueba gratis (null si ya no queda)
     */
    String createCheckoutUrl(String customerId, Long businessId, Instant trialEnd);

    /** abre el portal del cliente (cambiar tarjeta, ver facturas, cancelar) y devuelve su direccion */
    String createPortalUrl(String customerId);

    /** estado actual de una suscripcion */
    SubscriptionInfo getSubscription(String subscriptionId);

    /** lo que nos interesa de una suscripcion de Stripe */
    record SubscriptionInfo(String id, String customerId, String status,
                            Instant trialEnd, Instant currentPeriodEnd) {
    }
}
