package com.optima.api.modules.client.controller;

import com.optima.api.modules.client.dto.request.ClientRequest;
import com.optima.api.modules.client.dto.response.ClientResponse;
import com.optima.api.modules.client.service.ClientService;
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

/** rutas de clientes del negocio */
@RestController
@RequestMapping("/api/businesses/{businessId}/clients")
@RequiredArgsConstructor
@Validated
public class ClientController {

    private final ClientService clientService;

    /** crea un nuevo cliente final del negocio */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClientResponse create(@PathVariable @Positive Long businessId,
                                 @Valid @RequestBody ClientRequest request) {
        return clientService.create(businessId, request);
    }

    /**
     * lista clientes activos o archivados con busqueda opcional
     */
    @GetMapping
    public Page<ClientResponse> listByBusiness(@PathVariable @Positive Long businessId,
                                               @RequestParam(defaultValue = "true") boolean active,
                                               @RequestParam(required = false) String search,
                                               @ParameterObject @PageableDefault(sort = {"fullName", "id"}) Pageable pageable) {
        return clientService.listByBusiness(businessId, active, search, pageable);
    }

    /** obtiene un cliente del negocio */
    @GetMapping("/{id}")
    public ClientResponse getById(@PathVariable @Positive Long businessId, @PathVariable @Positive Long id) {
        return clientService.getById(businessId, id);
    }

    /** actualiza los datos editables de un cliente */
    @PutMapping("/{id}")
    public ClientResponse update(@PathVariable @Positive Long businessId,
                                 @PathVariable @Positive Long id,
                                 @Valid @RequestBody ClientRequest request) {
        return clientService.update(businessId, id, request);
    }

    /** archiva un cliente sin borrarlo (solo ADMIN, M7) */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable @Positive Long businessId, @PathVariable @Positive Long id) {
        clientService.deactivate(businessId, id);
    }

    /**
     * reactiva un cliente que estaba archivado
     */
    @PatchMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ClientResponse reactivate(@PathVariable @Positive Long businessId,
                                     @PathVariable @Positive Long id) {
        return clientService.reactivate(businessId, id);
    }
}
