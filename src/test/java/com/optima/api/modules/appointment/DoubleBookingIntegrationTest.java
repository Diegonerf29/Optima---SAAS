package com.optima.api.modules.appointment;

import com.optima.api.support.Escenario;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static com.optima.api.support.Escenario.LUNES;
import static com.optima.api.support.Escenario.en;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * regresion de M1: dos reservas solapadas del mismo empleado que llegan a la vez
 * solo una puede salir bien
 */
class DoubleBookingIntegrationTest extends IntegrationTest {

    private static final int RONDAS = 15;

    @Test
    void dosReservasSolapadasSimultaneasNuncaSalenBienLasDos() throws Exception {
        Escenario e = Escenario.nuevo(mockMvc);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        int dobles = 0;
        try {
            for (int ronda = 0; ronda < RONDAS; ronda++) {
                // cada ronda en un dia distinto (de lunes a sabado)
                LocalDate dia = LUNES.plusWeeks(ronda / 6).plusDays(ronda % 6);
                Map<String, Object> a = e.cita(en(dia, "10:00"), null, e.servicio60);
                Map<String, Object> b = e.cita(en(dia, "10:30"), null, e.servicio60);

                CountDownLatch salida = new CountDownLatch(1);
                List<Future<Integer>> resultados = new ArrayList<>();
                for (Map<String, Object> cita : List.of(a, b)) {
                    resultados.add(pool.submit(() -> {
                        salida.await();
                        return e.crearCita(cita).andReturn().getResponse().getStatus();
                    }));
                }
                salida.countDown();

                int creadas = 0;
                for (Future<Integer> r : resultados) {
                    int status = r.get();
                    assertThat(status).isIn(201, 409);
                    if (status == 201) {
                        creadas++;
                    }
                }
                if (creadas == 2) {
                    dobles++;
                }
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(dobles).as("rondas con doble reserva").isZero();
    }
}
