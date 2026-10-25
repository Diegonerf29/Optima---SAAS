package com.optima.api.modules.catalog.dto.response;

import com.optima.api.modules.catalog.model.Offering;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** datos de un servicio del catalogo */
public record OfferingResponse(
        Long id,
        Long businessId,
        Long categoryId,
        String categoryName,
        Long taxId,
        String taxName,
        String name,
        String description,
        BigDecimal price,
        Integer durationMinutes,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime deactivatedAt
) {
    public static OfferingResponse from(Offering service) {
        return new OfferingResponse(
                service.getId(),
                service.getBusiness().getId(),
                service.getCategory().getId(),
                service.getCategory().getName(),
                service.getTax().getId(),
                service.getTax().getName(),
                service.getName(),
                service.getDescription(),
                service.getPrice(),
                service.getDurationMinutes(),
                service.getIsActive(),
                service.getCreatedAt(),
                service.getDeactivatedAt()
        );
    }
}
