package com.optima.api.modules.billing.controller;

import com.optima.api.modules.billing.dto.BillingResponse;
import com.optima.api.modules.billing.dto.RedirectResponse;
import com.optima.api.modules.billing.service.BillingService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** suscripcion del negocio a Optima */
@RestController
@RequestMapping("/api/businesses/{businessId}/billing")
@RequiredArgsConstructor
@Validated
public class BillingController {

    private final BillingService billingService;

    /** estado de la suscripcion (todo el equipo: asi un empleado sabe por que no puede entrar) */
    @GetMapping
    public BillingResponse get(@PathVariable @Positive Long businessId) {
        return billingService.get(businessId);
    }

    /** direccion de la pagina de pago de Stripe para suscribirse */
    @PostMapping("/checkout")
    @PreAuthorize("hasRole('ADMIN')")
    public RedirectResponse checkout(@PathVariable @Positive Long businessId) {
        return new RedirectResponse(billingService.checkoutUrl(businessId));
    }

    /** direccion del portal de Stripe: tarjeta, facturas y cancelar */
    @PostMapping("/portal")
    @PreAuthorize("hasRole('ADMIN')")
    public RedirectResponse portal(@PathVariable @Positive Long businessId) {
        return new RedirectResponse(billingService.portalUrl(businessId));
    }
}
