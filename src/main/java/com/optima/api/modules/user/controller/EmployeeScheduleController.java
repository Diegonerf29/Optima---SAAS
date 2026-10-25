package com.optima.api.modules.user.controller;

import com.optima.api.modules.user.dto.request.EmployeeScheduleRequest;
import com.optima.api.modules.user.dto.response.EmployeeScheduleResponse;
import com.optima.api.modules.user.service.EmployeeScheduleService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** rutas del horario semanal de un empleado */
@RestController
@RequestMapping("/api/businesses/{businessId}/users/{membershipId}/schedules")
@RequiredArgsConstructor
@Validated
public class EmployeeScheduleController {

    private final EmployeeScheduleService scheduleService;

    /**
     * crea un tramo del horario semanal del empleado
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeScheduleResponse create(@PathVariable @Positive Long businessId,
                                           @PathVariable @Positive Long membershipId,
                                           @Valid @RequestBody EmployeeScheduleRequest request) {
        return scheduleService.create(businessId, membershipId, request);
    }

    /**
     * lista todos los tramos del horario del empleado
     */
    @GetMapping
    public List<EmployeeScheduleResponse> listByEmployee(@PathVariable @Positive Long businessId,
                                                         @PathVariable @Positive Long membershipId) {
        return scheduleService.listByEmployee(businessId, membershipId);
    }

    /**
     * obtiene un tramo concreto del horario
     */
    @GetMapping("/{id}")
    public EmployeeScheduleResponse getById(@PathVariable @Positive Long businessId,
                                            @PathVariable @Positive Long membershipId,
                                            @PathVariable @Positive Long id) {
        return scheduleService.getById(businessId, membershipId, id);
    }

    /**
     * actualiza dia y horas de un tramo existente
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeScheduleResponse update(@PathVariable @Positive Long businessId,
                                           @PathVariable @Positive Long membershipId,
                                           @PathVariable @Positive Long id,
                                           @Valid @RequestBody EmployeeScheduleRequest request) {
        return scheduleService.update(businessId, membershipId, id, request);
    }

    /**
     * elimina un tramo del horario
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable @Positive Long businessId,
                       @PathVariable @Positive Long membershipId,
                       @PathVariable @Positive Long id) {
        scheduleService.delete(businessId, membershipId, id);
    }
}
