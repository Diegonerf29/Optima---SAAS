package com.optima.api.modules.billing.service;

import com.optima.api.modules.business.model.Business;
import com.stripe.StripeClient;
import com.stripe.exception.StripeException;
import com.stripe.model.Subscription;
import com.stripe.model.SubscriptionItem;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

/** StripeGateway con la libreria oficial de Stripe */
@Slf4j
@Component
public class StripeSdkGateway implements StripeGateway {

    private final StripeClient client;
    private final String priceId;
    private final String frontendUrl;

    public StripeSdkGateway(@Value("${app.billing.enabled:false}") boolean enabled,
                            @Value("${app.billing.stripe.secret-key:}") String secretKey,
                            @Value("${app.billing.stripe.price-id:}") String priceId,
                            @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl) {
        // con los pagos activados, sin clave o sin precio la app no arranca (mejor que fallar al cobrar)
        if (enabled && (secretKey.isBlank() || priceId.isBlank())) {
            throw new IllegalStateException("BILLING_ENABLED=true necesita STRIPE_SECRET_KEY y STRIPE_PRICE_ID");
        }
        this.client = secretKey.isBlank() ? null : new StripeClient(secretKey);
        this.priceId = priceId;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public String createCustomer(Business business) {
        CustomerCreateParams params = CustomerCreateParams.builder()
                .setEmail(business.getEmail())
                .setName(business.getName())
                .putMetadata("businessId", String.valueOf(business.getId()))
                .build();
        try {
            return client().v1().customers().create(params).getId();
        } catch (StripeException e) {
            throw stripeError(e);
        }
    }

    @Override
    public String createCheckoutUrl(String customerId, Long businessId, Instant trialEnd) {
        String settings = frontendUrl + "/app/settings?tab=suscripcion";
        SessionCreateParams.Builder params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setCustomer(customerId)
                .setClientReferenceId(String.valueOf(businessId))
                .addLineItem(SessionCreateParams.LineItem.builder().setPrice(priceId).setQuantity(1L).build())
                .setLocale(SessionCreateParams.Locale.ES)
                .setSuccessUrl(settings + "&pago=ok")
                .setCancelUrl(settings);
        if (trialEnd != null) {
            // los dias de prueba que quedan se respetan: el primer cobro llega al acabar la prueba
            params.setSubscriptionData(SessionCreateParams.SubscriptionData.builder()
                    .setTrialEnd(trialEnd.getEpochSecond()).build());
        }
        try {
            return client().v1().checkout().sessions().create(params.build()).getUrl();
        } catch (StripeException e) {
            throw stripeError(e);
        }
    }

    @Override
    public String createPortalUrl(String customerId) {
        var params = com.stripe.param.billingportal.SessionCreateParams.builder()
                .setCustomer(customerId)
                .setReturnUrl(frontendUrl + "/app/settings?tab=suscripcion")
                .build();
        try {
            return client().v1().billingPortal().sessions().create(params).getUrl();
        } catch (StripeException e) {
            throw stripeError(e);
        }
    }

    @Override
    public SubscriptionInfo getSubscription(String subscriptionId) {
        try {
            Subscription s = client().v1().subscriptions().retrieve(subscriptionId);
            // el fin del periodo pagado va en cada elemento de la suscripcion (aqui solo hay uno)
            List<SubscriptionItem> items = s.getItems() == null ? List.of() : s.getItems().getData();
            Long periodEnd = items.isEmpty() ? null : items.getFirst().getCurrentPeriodEnd();
            return new SubscriptionInfo(s.getId(), s.getCustomer(), s.getStatus(),
                    toInstant(s.getTrialEnd()), toInstant(periodEnd));
        } catch (StripeException e) {
            throw stripeError(e);
        }
    }

    private StripeClient client() {
        if (client == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Los pagos no están configurados");
        }
        return client;
    }

    private static Instant toInstant(Long epochSeconds) {
        return epochSeconds == null ? null : Instant.ofEpochSecond(epochSeconds);
    }

    /** el detalle se queda en el log; al usuario le llega un mensaje claro */
    private static ResponseStatusException stripeError(StripeException e) {
        log.error("Error de Stripe ({}): {}", e.getCode(), e.getMessage());
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "No se ha podido conectar con el sistema de pagos. Inténtalo de nuevo en unos minutos");
    }
}
