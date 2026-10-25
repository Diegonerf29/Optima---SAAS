package com.optima.api.modules.billing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** aviso de Stripe ya procesado (para no aplicarlo dos veces) */
@Entity
@Table(name = "stripe_events")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class StripeEvent {

    /** id del evento en Stripe (evt_...) */
    @Id
    @Column(name = "id", length = 255)
    private String id;

    @Column(name = "type", nullable = false, length = 100)
    private String type;

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;
}
