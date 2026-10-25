package com.optima.api.modules.billing;

import com.optima.api.modules.billing.model.SubscriptionStatuses;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class SubscriptionStatusesTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2030, 1, 7, 10, 0);

    @Test
    void conSuscripcionPagadaOReintentandoElCobroSeEntra() {
        assertThat(SubscriptionStatuses.hasAccess("ACTIVE", null, AHORA)).isTrue();
        assertThat(SubscriptionStatuses.hasAccess("PAST_DUE", null, AHORA)).isTrue();
    }

    @Test
    void laPruebaSoloValeHastaSuFin() {
        assertThat(SubscriptionStatuses.hasAccess("TRIALING", AHORA.plusMinutes(1), AHORA)).isTrue();
        assertThat(SubscriptionStatuses.hasAccess("TRIALING", AHORA, AHORA)).isFalse();
        assertThat(SubscriptionStatuses.hasAccess("TRIALING", null, AHORA)).isFalse();
    }

    @Test
    void cancelada_sinPagar_oIncompletaNoEntra() {
        for (String estado : new String[]{"CANCELED", "UNPAID", "INCOMPLETE", "INCOMPLETE_EXPIRED", "PAUSED"}) {
            assertThat(SubscriptionStatuses.hasAccess(estado, AHORA.plusDays(5), AHORA)).as(estado).isFalse();
        }
    }

    @Test
    void traduceLosEstadosDeStripe() {
        assertThat(SubscriptionStatuses.fromStripe("past_due")).isEqualTo("PAST_DUE");
        assertThat(SubscriptionStatuses.fromStripe(null)).isEqualTo("INCOMPLETE");
    }
}
