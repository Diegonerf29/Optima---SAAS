package com.optima.api.modules.user.controller;

import com.optima.api.common.security.AuthPrincipal;
import com.optima.api.modules.user.dto.request.CreateUserRequest;
import com.optima.api.modules.user.dto.request.UpdateUserRequest;
import com.optima.api.modules.user.dto.response.UserResponse;
import com.optima.api.modules.user.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/** rutas de empleados de un negocio */
@RestController
@RequestMapping("/api/businesses/{businessId}/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserService userService;

    /**
     * crea un empleado dentro del negocio
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse create(@AuthenticationPrincipal AuthPrincipal principal,
                               @PathVariable @Positive Long businessId,
                               @Valid @RequestBody CreateUserRequest request) {
        return userService.create(businessId, request, principal.userId());
    }

    /**
     * lista las invitaciones pendientes del negocio
     */
    @GetMapping("/invitations")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<UserResponse> listInvitations(@PathVariable @Positive Long businessId, @ParameterObject @PageableDefault(sort = "invitedAt") Pageable pageable) {
        return userService.listInvitations(businessId, pageable);
    }

    /**
     * lista empleados activos o archivados del negocio
     */
    @GetMapping
    public Page<UserResponse> listByBusiness(@AuthenticationPrincipal AuthPrincipal principal,
                                             @PathVariable @Positive Long businessId,
                                             @RequestParam(defaultValue = "true") boolean active,
                                             @ParameterObject @PageableDefault(sort = {"user.fullName", "id"}) Pageable pageable) {
        // un EMPLOYEE ve nombre y color de sus compañeros, no su email ni su telefono (M7)
        return userService.listByBusiness(businessId, active, pageable)
                .map(u -> u.visibleTo(principal.userId(), principal.role()));
    }

    /**
     * obtiene un empleado del negocio por su id
     */
    @GetMapping("/{id}")
    public UserResponse getById(@AuthenticationPrincipal AuthPrincipal principal,
                                @PathVariable @Positive Long businessId, @PathVariable @Positive Long id) {
        return userService.getById(businessId, id).visibleTo(principal.userId(), principal.role());
    }

    /**
     * actualiza los datos propios de la relacion del empleado
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse update(@PathVariable @Positive Long businessId,
                               @PathVariable @Positive Long id,
                               @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(businessId, id, request);
    }

    /**
     * desactiva la relacion del empleado en este negocio
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deactivate(@AuthenticationPrincipal AuthPrincipal principal,
                           @PathVariable @Positive Long businessId,
                           @PathVariable @Positive Long id) {
        userService.deactivate(businessId, id, principal.userId());
    }

    /**
     * reactiva la relacion de un empleado archivado
     */
    @PatchMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse reactivate(@PathVariable @Positive Long businessId,
                                   @PathVariable @Positive Long id) {
        return userService.reactivate(businessId, id);
    }
}
