package com.optima.api.modules.business;

import com.optima.api.common.geocoding.Coordinates;
import com.optima.api.common.geocoding.GeocodingService;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static com.optima.api.support.TestApi.unico;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** B19: las coordenadas se calculan despues de guardar y solo si cambia la direccion */
class BusinessGeocodingIntegrationTest extends IntegrationTest {

    @MockitoBean
    private GeocodingService geocodingService;

    @Test
    void lasCoordenadasLleganDespuesYSoloSeRecalculanSiCambiaLaDireccion() throws Exception {
        when(geocodingService.geocode(any(), any(), any(), any()))
                .thenReturn(Optional.of(new Coordinates(new BigDecimal("40.41650000"), new BigDecimal("-3.70380000"))));
        String u = unico();
        String token = json(mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of(
                                "business", Map.of("name", "Local " + u, "slug", "local-" + u, "email", "l-" + u + "@ejemplo.com",
                                        "address", "Calle Mayor 1", "city", "Madrid", "country", "España"),
                                "admin", Map.of("fullName", "Dueña", "email", "d-" + u + "@ejemplo.com", "password", "clave-segura-1")))))
                .andExpect(status().isCreated()).andReturn()).path("token").asString();
        long id = json(mockMvc.perform(get("/api/me/businesses").header("Authorization", bearer(token))).andReturn())
                .get(0).path("businessId").asLong();

        verify(geocodingService, timeout(3000)).geocode(any(), any(), any(), any());
        JsonNode negocio = esperarCoordenadas(token, id);
        assertThat(negocio.path("latitude").decimalValue()).isEqualByComparingTo("40.4165");

        // cambiar solo el nombre no vuelve a llamar a Nominatim
        mockMvc.perform(put("/api/businesses/" + id).header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("name", "Otro nombre", "email", "l-" + u + "@ejemplo.com",
                                "address", "Calle Mayor 1", "city", "Madrid", "country", "España"))))
                .andExpect(status().isOk());
        verify(geocodingService, after(1000).times(1)).geocode(any(), any(), any(), any());
    }

    private JsonNode esperarCoordenadas(String token, long id) throws Exception {
        for (int i = 0; i < 30; i++) {
            JsonNode b = json(mockMvc.perform(get("/api/businesses/" + id).header("Authorization", bearer(token))).andReturn());
            if (!b.path("latitude").isNull()) {
                return b;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("No llegaron las coordenadas");
    }
}
