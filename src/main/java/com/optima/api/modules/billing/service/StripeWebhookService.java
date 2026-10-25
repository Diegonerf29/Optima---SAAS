package com.optima.api.modules.billing.service;

import com.optima.api.modules.billing.model.StripeEvent;
import com.optima.api.modules.billing.repository.StripeEventRepository;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Set;

/**
 * avisos de Stripe (9.6): POST /api/webhooks/stripe
 * la ruta es publica, asi que solo se acepta un aviso con la firma correcta de Stripe.
 * Del aviso solo se usa el id de la suscripcion: su estado se pregunta a Stripe,
 * asi da igual si los avisos llegan desordenados o repetidos
 */
@Slf4j
@Service
public class StripeWebhookService {

    private static final Set<String> SUBSCRIPTION_EVENTS = Set.of(
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
            "customer.subscription.paused",
            "customer.subscription.resumed");
    private static final String CHECKOUT_COMPLETED = "checkout.session.completed";

    private final BillingService billing;
    private final StripeGateway stripe;
    private final StripeEventRepository events;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final String webhookSecret;

    public StripeWebhookService(BillingService billing,
                                StripeGateway stripe,
                                StripeEventRepository events,
                                ObjectMapper objectMapper,
                                Clock clock,
                                @Value("${app.billing.stripe.webhook-secret:}") String webhookSecret) {
        if (billing.isEnabled() && webhookSecret.isBlank()) {
            throw new IllegalStateException("BILLING_ENABLED=true necesita STRIPE_WEBHOOK_SECRET");
        }
        this.billing = billing;
        this.stripe = stripe;
        this.events = events;
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.webhookSecret = webhookSecret;
    }

    @Transactional
    public void handle(String payload, String signature) {
        if (!billing.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Los pagos no están activados en este servidor");
        }
        Event event;
        try {
            // comprueba la firma (HMAC con el secreto del webhook) y que el aviso es reciente
            event = Webhook.constructEvent(payload, signature, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.warn("Aviso de Stripe con firma no valida");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Firma no válida");
        }

        // Stripe puede repetir un aviso: si ya se proceso, no se hace nada
        if (events.existsById(event.getId())) {
            return;
        }
        String subscriptionId = subscriptionIdOf(event.getType(), payload);
        if (subscriptionId != null) {
            billing.apply(stripe.getSubscription(subscriptionId));
        }
        events.save(new StripeEvent(event.getId(), event.getType(), LocalDateTime.now(clock.withZone(ZoneOffset.UTC))));
    }

    /** id de la suscripcion a la que se refiere el aviso, o null si el aviso no nos interesa */
    private String subscriptionIdOf(String type, String payload) {
        JsonNode object = objectMapper.readTree(payload).path("data").path("object");
        JsonNode id;
        if (SUBSCRIPTION_EVENTS.contains(type)) {
            id = object.path("id");
        } else if (CHECKOUT_COMPLETED.equals(type)) {
            id = object.path("subscription");
        } else {
            return null;
        }
        return id.isMissingNode() || id.isNull() ? null : id.asString();
    }
}
