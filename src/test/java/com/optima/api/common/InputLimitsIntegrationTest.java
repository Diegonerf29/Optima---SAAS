package com.optima.api.common;

import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static com.optima.api.support.TestApi.DEMO_PASSWORD;
import static com.optima.api.support.TestApi.EMPLEADO_DEMO;
import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.toJson;
import static com.optima.api.support.TestApi.tokenDeNegocio;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** regresion de B4: textos y listas con tamaño maximo */
class InputLimitsIntegrationTest extends IntegrationTest {

    @Test
    void citaConDemasiadosServiciosDa400() throws Exception {
        String token = tokenDeNegocio(mockMvc, EMPLEADO_DEMO, DEMO_PASSWORD, 1);
        Map<String, Object> cita = new HashMap<>(Map.of(
                "clientId", 2, "membershipId", 2, "startDateTime", "2030-01-07T10:00:00",
                "serviceIds", Collections.nCopies(21, 1)));
        mockMvc.perform(post("/api/businesses/1/appointments").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(toJson(cita)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void notasEnormesDan400() throws Exception {
        String token = tokenDeNegocio(mockMvc, EMPLEADO_DEMO, DEMO_PASSWORD, 1);
        mockMvc.perform(post("/api/businesses/1/clients").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("fullName", "Cliente", "notes", "x".repeat(2001)))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rangoDeAusenciasDeMasDeTresMesesDa400() throws Exception {
        String token = tokenDeNegocio(mockMvc, EMPLEADO_DEMO, DEMO_PASSWORD, 1);
        mockMvc.perform(get("/api/businesses/1/absences?from=2030-01-01&to=2030-12-31").header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/businesses/1/absences?from=2030-01-01&to=2030-01-31").header("Authorization", bearer(token)))
                .andExpect(status().isOk());
    }

    @Test
    void loginConContrasenaEnormeDa400() throws Exception {
        mockMvc.perform(post("/api/auth/token").contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", EMPLEADO_DEMO, "password", "x".repeat(500)))))
                .andExpect(status().isBadRequest());
    }
}
