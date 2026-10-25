package com.optima.api.modules.appointment.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** datos de entrada para cobrar una cita o deshacer el cobro */
public record UpdatePaymentRequest(

        @NotNull(message = "El estado de pago (isPaid) es obligatorio")
        Boolean isPaid,

        // forma de pago al cobrar; si no se indica se guarda como OTHER
        @Pattern(regexp = "CASH|CARD|BIZUM|OTHER", message = "La forma de pago debe ser CASH, CARD, BIZUM u OTHER")
        String paymentMethod
) {}
