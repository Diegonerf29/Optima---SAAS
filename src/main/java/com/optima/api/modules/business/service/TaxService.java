package com.optima.api.modules.business.service;

import com.optima.api.common.exception.NotFoundException;
import com.optima.api.modules.business.dto.request.CreateTaxRequest;
import com.optima.api.modules.business.dto.response.TaxResponse;
import com.optima.api.modules.business.dto.request.UpdateTaxRequest;
import com.optima.api.modules.business.model.Tax;
import com.optima.api.modules.business.repository.BusinessRepository;
import com.optima.api.modules.business.repository.TaxRepository;
import com.optima.api.modules.catalog.repository.BusinessServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

/** logica de impuestos del negocio */
@Service
@Transactional
@RequiredArgsConstructor
public class TaxService {

    private final TaxRepository taxRepository;
    private final BusinessRepository businessRepository;
    private final BusinessServiceRepository businessServiceRepository;

    /**
     * crea un impuesto nuevo del negocio
     * si ya existe otro con el mismo nombre devuelve conflicto
     */
    public TaxResponse create(Long businessId, CreateTaxRequest request) {
        var business = businessRepository.findById(businessId)
            .orElseThrow(() -> new NotFoundException("el negocio", businessId));

        // se compara con el nombre ya recortado, igual que se guarda (B11)
        String name = request.name().trim();
        if (taxRepository.existsByBusinessIdAndNameIgnoreCase(businessId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Ya existe un impuesto con ese nombre en este negocio");
        }

        Tax t = new Tax();
        t.setBusiness(business);
        t.setName(name);
        t.setPercentage(request.percentage());
        t.setIsActive(true);

        return TaxResponse.from(taxRepository.save(t));
    }

    /** lista impuestos activos o archivados del negocio */
    @Transactional(readOnly = true)
    public Page<TaxResponse> listActive(Long businessId, boolean active, Pageable pageable) {
        Page<Tax> page = active
            ? taxRepository.findByBusinessIdAndIsActiveTrue(businessId, pageable)
            : taxRepository.findByBusinessIdAndIsActiveFalse(businessId, pageable);
        return page.map(TaxResponse::from);
    }

    /** devuelve un impuesto del negocio */
    @Transactional(readOnly = true)
    public TaxResponse getById(Long businessId, Long id) {
        return TaxResponse.from(findOrThrow(businessId, id));
    }

    /** actualiza un impuesto activo del negocio */
    public TaxResponse update(Long businessId, Long id, UpdateTaxRequest request) {
        Tax t = findOrThrow(businessId, id);

        if (!t.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El impuesto está desactivado");
        }
        String name = request.name().trim();
        if (!t.getName().equalsIgnoreCase(name) &&
            taxRepository.existsByBusinessIdAndNameIgnoreCase(businessId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Ya existe un impuesto con ese nombre en este negocio");
        }

        t.setName(name);
        t.setPercentage(request.percentage());

        return TaxResponse.from(taxRepository.save(t));
    }

    /** archiva el impuesto sin borrarlo fisicamente */
    public void deactivate(Long businessId, Long id) {
        Tax t = findOrThrow(businessId, id);
        if (!t.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El impuesto ya está desactivado");
        }
        // igual que con las categorias: no se archiva si lo usan servicios activos (B11)
        long activeServices = businessServiceRepository.countByTaxIdAndIsActiveTrue(id);
        if (activeServices > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "No se puede archivar el impuesto: lo usan " + activeServices
                    + " servicio" + (activeServices == 1 ? "" : "s") + " activo" + (activeServices == 1 ? "" : "s")
                    + ". Cambia o archiva esos servicios primero.");
        }
        t.setIsActive(false);
        t.setDeactivatedAt(LocalDateTime.now());
        taxRepository.save(t);
    }

    /** reactiva un impuesto archivado */
    public TaxResponse reactivate(Long businessId, Long id) {
        Tax t = findOrThrow(businessId, id);
        if (t.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El impuesto ya está activo");
        }
        t.setIsActive(true);
        t.setDeactivatedAt(null);
        return TaxResponse.from(taxRepository.save(t));
    }

    /** busca un impuesto dentro del negocio o lanza error */
    private Tax findOrThrow(Long businessId, Long id) {
        return taxRepository.findByIdAndBusinessId(id, businessId)
            .orElseThrow(() -> new NotFoundException("el impuesto", id));
    }
}
