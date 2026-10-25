package com.optima.api.modules.privacy.controller;

import com.optima.api.common.security.AuthPrincipal;
import com.optima.api.modules.client.dto.response.ClientResponse;
import com.optima.api.modules.privacy.dto.BusinessDataExport;
import com.optima.api.modules.privacy.dto.ClientDataExport;
import com.optima.api.modules.privacy.dto.EraseBusinessRequest;
import com.optima.api.modules.privacy.service.PrivacyService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** RGPD: descargar y borrar datos (solo ADMIN) */
@RestController
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class PrivacyController {

    private final PrivacyService privacyService;

    /** ficha y citas de un cliente */
    @GetMapping("/api/businesses/{businessId}/clients/{id}/export")
    public ClientDataExport exportClient(@PathVariable @Positive Long businessId, @PathVariable @Positive Long id) {
        return privacyService.exportClient(businessId, id);
    }

    /** borra los datos personales de un cliente (no se puede deshacer) */
    @PostMapping("/api/businesses/{businessId}/clients/{id}/anonymize")
    public ClientResponse anonymizeClient(@PathVariable @Positive Long businessId, @PathVariable @Positive Long id) {
        return privacyService.anonymizeClient(businessId, id);
    }

    /** todos los datos del negocio */
    @GetMapping("/api/businesses/{businessId}/export")
    public BusinessDataExport exportBusiness(@PathVariable @Positive Long businessId) {
        return privacyService.exportBusiness(businessId);
    }

    /** borra el negocio y todos sus datos (desactivado antes y con la contraseña) */
    @PostMapping("/api/businesses/{businessId}/erase")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eraseBusiness(@AuthenticationPrincipal AuthPrincipal principal,
                              @PathVariable @Positive Long businessId,
                              @Valid @RequestBody EraseBusinessRequest request) {
        privacyService.eraseBusiness(businessId, principal.userId(), request.password());
    }
}
