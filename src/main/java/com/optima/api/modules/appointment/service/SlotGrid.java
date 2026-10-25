package com.optima.api.modules.appointment.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * regla unica de los huecos de la agenda (M2)
 * los huecos se cuentan desde la hora de apertura de cada tramo del negocio:
 * con apertura a las 10:00 e intervalo de 45 son 10:00, 10:45, 11:30, 12:15...
 * la usan la disponibilidad (para ofrecer huecos) y la validacion (para aceptarlos),
 * asi nunca se ofrece un hueco que luego se rechaza
 */
public final class SlotGrid {

    private SlotGrid() {
    }

    /** true si la hora cae justo en un hueco contando desde la apertura */
    public static boolean isAligned(LocalTime start, LocalTime opening, int interval) {
        long minutes = Duration.between(opening, start).toMinutes();
        return minutes >= 0 && minutes % interval == 0
                && start.getSecond() == 0 && start.getNano() == 0;
    }

    /** primer hueco igual o posterior a t, contando desde la apertura */
    public static LocalDateTime alignUp(LocalDateTime t, LocalDateTime opening, int interval) {
        if (!t.isAfter(opening)) {
            return opening;
        }
        long seconds = Duration.between(opening, t).toSeconds();
        long step = interval * 60L;
        long slots = (seconds + step - 1) / step;   // redondeo hacia arriba
        return opening.plusMinutes(slots * interval);
    }
}
