package com.optima.api.modules.billing.controller;

import com.optima.api.modules.billing.service.StripeWebhookService;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/** avisos de Stripe; no es para el frontend, por eso no sale en la documentacion */
@Hidden
@RestController
@RequiredArgsConstructor
public class StripeWebhookController {

    private final StripeWebhookService webhookService;

    /** el cuerpo se lee tal cual (texto): la firma se calcula sobre esos bytes exactos */
    @PostMapping("/api/webhooks/stripe")
    public ResponseEntity<Void> receive(@RequestBody String payload,
                                        @RequestHeader("Stripe-Signature") String signature) {
        webhookService.handle(payload, signature);
        return ResponseEntity.ok().build();
    }
}
