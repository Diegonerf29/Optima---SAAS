package com.optima.api.modules.user.controller;

import com.optima.api.modules.user.dto.request.EmployeeAbsenceRequest;
import com.optima.api.modules.user.dto.response.EmployeeAbsenceResponse;
import com.optima.api.modules.user.service.EmployeeAbsenceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/** rutas para ausencias puntuales de empleados */
@RestController
@RequestMapping("/api/businesses/{businessId}/users/{membershipId}/absences")
@RequiredArgsConstructor
@Validated
public class EmployeeAbsenceController {

    private final EmployeeAbsenceService absenceService;

    /**
     * crea una ausencia para el empleado indicado
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeAbsenceResponse create(@PathVariable @Positive Long businessId,
                                          @PathVariable @Positive Long membershipId,
                                          @Valid @RequestBody EmployeeAbsenceRequest request) {
        return absenceService.create(businessId, membershipId, request);
    }

    /**
     * lista de ausencias del empleado
     */
    @GetMapping
    public Page<EmployeeAbsenceResponse> listByEmployee(@PathVariable @Positive Long businessId,
                                                        @PathVariable @Positive Long membershipId,
                                                        @PageableDefault(sort = {"startDateTime", "id"}) Pageable pageable) {
        return absenceService.listByEmployee(businessId, membershipId, pageable);
    }

    /**
     * obtiene una ausencia concreta del empleado
     */
    @GetMapping("/{id}")
    public EmployeeAbsenceResponse getById(@PathVariable @Positive Long businessId,
                                           @PathVariable @Positive Long membershipId,
                                           @PathVariable @Positive Long id) {
        return absenceService.getById(businessId, membershipId, id);
    }

    /**
     * actualiza el rango y motivo de una ausencia
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeAbsenceResponse update(@PathVariable @Positive Long businessId,
                                          @PathVariable @Positive Long membershipId,
                                          @PathVariable @Positive Long id,
                                          @Valid @RequestBody EmployeeAbsenceRequest request) {
        return absenceService.update(businessId, membershipId, id, request);
    }

    /**
     * elimina una ausencia
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable @Positive Long businessId,
                       @PathVariable @Positive Long membershipId,
                       @PathVariable @Positive Long id) {
        absenceService.delete(businessId, membershipId, id);
    }
}
