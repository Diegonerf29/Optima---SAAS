package com.optima.api.modules.appointment.dto.response;

import com.optima.api.modules.appointment.model.Appointment;
import com.optima.api.modules.appointment.model.BookedService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * datos de salida de una cita
 * los precios del catalogo son PVP con IVA incluido: total es la suma de los precios aplicados,
 * taxAmount el IVA que va dentro y subtotal la base (calculados en el servidor con BigDecimal, M8)
 */
public record AppointmentResponse(
        Long id,
        Long businessId,
        Long clientId,
        String clientName,
        Long membershipId,
        String userFullName,
        Long boothId,
        String boothName,
        Long statusId,
        String statusName,
        Boolean isPaid,
        LocalDateTime paidAt,
        String paidByName,
        String paymentMethod,
        LocalDateTime startDateTime,
        LocalDateTime endDateTime,
        String notes,
        BigDecimal subtotal,
        BigDecimal taxAmount,
        BigDecimal total,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<BookedServiceResponse> bookedServices
) {
    private static final BigDecimal CIEN = BigDecimal.valueOf(100);

    /** pasa la entidad a datos de salida */
    public static AppointmentResponse from(Appointment a,
                                           List<BookedService> bookedServices) {
        List<BookedServiceResponse> mapped = bookedServices.stream()
                .map(BookedServiceResponse::from)
                .toList();

        BigDecimal total = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        for (BookedService b : bookedServices) {
            total = total.add(b.getAppliedPrice());
            tax = tax.add(includedTax(b.getAppliedPrice(), b.getAppliedTaxPercentage()));
        }
        total = total.setScale(2, RoundingMode.HALF_UP);
        tax = tax.setScale(2, RoundingMode.HALF_UP);

        return new AppointmentResponse(
                a.getId(),
                a.getBusiness().getId(),
                a.getClient().getId(),
                a.getClient().getFullName(),
                a.getMembership().getId(),
                a.getMembership().getUser().getFullName(),
                a.getBooth() != null ? a.getBooth().getId() : null,
                a.getBooth() != null ? a.getBooth().getName() : null,
                a.getStatus().getId(),
                a.getStatus().getName(),
                a.getIsPaid(),
                a.getPaidAt(),
                a.getPaidBy() != null ? a.getPaidBy().getUser().getFullName() : null,
                a.getPaymentMethod(),
                a.getStartDateTime(),
                a.getEndDateTime(),
                a.getNotes(),
                total.subtract(tax),
                tax,
                total,
                a.getCreatedAt(),
                a.getUpdatedAt(),
                mapped
        );
    }

    /** IVA que va dentro de un precio con IVA incluido: precio - precio / (1 + iva/100) */
    static BigDecimal includedTax(BigDecimal priceWithTax, BigDecimal taxPercentage) {
        BigDecimal factor = BigDecimal.ONE.add(taxPercentage.divide(CIEN, 6, RoundingMode.HALF_UP));
        BigDecimal base = priceWithTax.divide(factor, 6, RoundingMode.HALF_UP);
        return priceWithTax.subtract(base);
    }
}
