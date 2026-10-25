package com.optima.api.modules.catalog.controller;

import com.optima.api.modules.catalog.dto.request.ServiceRequest;
import com.optima.api.modules.catalog.dto.response.OfferingResponse;
import com.optima.api.modules.catalog.service.OfferingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/** gestion de servicios comerciales del catalogo */
@RestController
@RequestMapping("/api/businesses/{businessId}/services")
@RequiredArgsConstructor
@Validated
public class OfferingController {

    private final OfferingService offeringService;

    /** crea un servicio del catalogo */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public OfferingResponse createService(@PathVariable @Positive Long businessId,
                                         @Valid @RequestBody ServiceRequest request) {
        return offeringService.createService(businessId, request);
    }

    /** lista de servicios del negocio */
    @GetMapping
    public Page<OfferingResponse> getServicesByBusiness(@PathVariable @Positive Long businessId,
                                                       @RequestParam(defaultValue = "true") boolean active,
                                                       @ParameterObject @PageableDefault(sort = "name") Pageable pageable) {
        return offeringService.getActiveServicesByBusiness(businessId, active, pageable);
    }

    /** obtiene un servicio del negocio */
    @GetMapping("/{id}")
    public OfferingResponse getServiceById(@PathVariable @Positive Long businessId,
                                          @PathVariable @Positive Long id) {
        return offeringService.getServiceById(businessId, id);
    }

    /** actualiza un servicio del catalogo */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public OfferingResponse updateService(@PathVariable @Positive Long businessId,
                                         @PathVariable @Positive Long id,
                                         @Valid @RequestBody ServiceRequest request) {
        return offeringService.updateService(businessId, id, request);
    }

    /** desactiva un servicio del catalogo */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deactivateService(@PathVariable @Positive Long businessId, @PathVariable @Positive Long id) {
        offeringService.deactivateService(businessId, id);
    }

    /** reactiva un servicio desactivado */
    @PatchMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public OfferingResponse reactivateService(@PathVariable @Positive Long businessId,
                                                     @PathVariable @Positive Long id) {
        return offeringService.reactivateService(businessId, id);
    }
}
