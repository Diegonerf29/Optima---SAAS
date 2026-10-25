package com.optima.api.modules.appointment;

import com.optima.api.common.mail.MailService;
import com.optima.api.modules.appointment.notification.ClientNotifier;
import com.optima.api.support.Escenario;
import com.optima.api.support.IntegrationTest;
import com.optima.api.support.TestApi;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;

import static com.optima.api.support.Escenario.LUNES;
import static com.optima.api.support.Escenario.en;
import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** P6: avisos por email al cliente; reloj fijo: lunes 7/1/2030 a las 10:30 en Madrid */
class ClientNotificationsIntegrationTest extends IntegrationTest {

    @TestConfiguration
    static class RelojFijo {
        @Bean
        @Primary
        Clock relojDeTest() {
            return Clock.fixed(Instant.parse("2030-01-07T09:30:00Z"), ZoneOffset.UTC);
        }
    }

    @MockitoBean
    private MailService mailService;

    @Autowired
    private ClientNotifier notifier;

    private Escenario e;
    private String emailCliente;
    private long clienteConEmail;

    @BeforeEach
    void negocio() throws Exception {
        e = Escenario.nuevo(mockMvc);
        emailCliente = "cliente-" + TestApi.unico() + "@ejemplo.com";
        clienteConEmail = e.crear("/clients", Map.of("fullName", "Lucia", "email", emailCliente));
    }

    @Test
    void confirmacionCambioYCancelacion() throws Exception {
        long id = cita(LUNES, "12:00");
        verify(mailService, timeout(3000)).sendSimpleEmail(eq(emailCliente), startsWith("Cita confirmada"),
                contains("lunes 7 de enero a las 12:00"), anyString());

        Map<String, Object> movida = e.cita(en(LUNES, "17:00"), null, e.servicio30);
        movida.put("clientId", clienteConEmail);
        e.editarCita(id, movida).andExpect(status().isOk());
        verify(mailService, timeout(3000)).sendSimpleEmail(eq(emailCliente), contains("ha cambiado"),
                contains("a las 17:00"), anyString());

        e.cambiarEstado(id, "CANCELLED").andExpect(status().isOk());
        verify(mailService, timeout(3000)).sendSimpleEmail(eq(emailCliente), startsWith("Cita cancelada"),
                anyString(), anyString());
    }

    @Test
    void siElNegocioLosDesactivaNoSeEnvianAvisos() throws Exception {
        mockMvc.perform(put(e.url("")).header("Authorization", bearer(e.token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("name", "Salon", "email", "s-" + e.businessId + "@ejemplo.com", "sendClientEmails", false))))
                .andExpect(status().isOk());
        cita(LUNES, "12:00");
        verify(mailService, after(1000).never()).sendSimpleEmail(eq(emailCliente), anyString(), anyString(), anyString());
    }

    @Test
    void recordatorioUnaSolaVezParaLasCitasDeLasProximas24Horas() throws Exception {
        cita(LUNES.plusDays(1), "10:00");   // dentro de 23,5 horas
        cita(LUNES.plusDays(2), "10:00");   // dentro de 47,5 horas: todavia no

        notifier.sendReminders();
        notifier.sendReminders();

        verify(mailService, times(1)).sendSimpleEmail(eq(emailCliente), startsWith("Recordatorio"),
                contains("martes 8 de enero a las 10:00"), anyString());
        verify(mailService, never()).sendSimpleEmail(eq(emailCliente), startsWith("Recordatorio"),
                contains("miércoles 9 de enero"), anyString());
    }

    private long cita(LocalDate dia, String hora) throws Exception {
        Map<String, Object> cita = e.cita(en(dia, hora), null, e.servicio30);
        cita.put("clientId", clienteConEmail);
        return json(e.crearCita(cita).andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }
}
