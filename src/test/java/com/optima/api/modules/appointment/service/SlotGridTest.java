package com.optima.api.modules.appointment.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class SlotGridTest {

    private static final LocalDateTime APERTURA = LocalDateTime.of(2030, 1, 7, 10, 0);

    @ParameterizedTest
    @CsvSource({
            "10:00, 45, true", "10:45, 45, true", "11:30, 45, true", "12:15, 45, true",
            "11:00, 45, false", "10:30, 45, false", "09:15, 45, false",
            "10:30, 30, true", "10:15, 30, false", "10:15, 15, true", "11:00, 60, true", "11:30, 60, false"
    })
    void huecosContadosDesdeLaApertura(String hora, int intervalo, boolean alineado) {
        assertThat(SlotGrid.isAligned(LocalTime.parse(hora), LocalTime.of(10, 0), intervalo)).isEqualTo(alineado);
    }

    @Test
    void alinearHaciaArribaDesdeLaApertura() {
        // un empleado que empieza a las 10:20 con intervalo 45 tiene su primer hueco a las 10:45
        assertThat(SlotGrid.alignUp(APERTURA.withMinute(20), APERTURA, 45)).isEqualTo(APERTURA.withMinute(45));
        assertThat(SlotGrid.alignUp(APERTURA.withMinute(45), APERTURA, 45)).isEqualTo(APERTURA.withMinute(45));
        assertThat(SlotGrid.alignUp(APERTURA.withMinute(46), APERTURA, 45)).isEqualTo(APERTURA.withHour(11).withMinute(30));
        // antes de la apertura se empieza en la apertura
        assertThat(SlotGrid.alignUp(APERTURA.withHour(9), APERTURA, 45)).isEqualTo(APERTURA);
    }

    @Test
    void conSegundosSeRedondeaAlSiguienteHueco() {
        assertThat(SlotGrid.alignUp(APERTURA.withSecond(1), APERTURA, 30)).isEqualTo(APERTURA.withMinute(30));
    }
}
