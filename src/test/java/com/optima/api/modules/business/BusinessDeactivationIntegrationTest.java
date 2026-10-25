package com.optima.api.modules.business;

import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import tools.jackson.databind.JsonNode;

import java.util.Map;

import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static com.optima.api.support.TestApi.unico;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** regresion de M4: un negocio desactivado deja de dar acceso, pero su admin puede reactivarlo */
class BusinessDeactivationIntegrationTest extends IntegrationTest {

    private static final String CLAVE = "clave-segura-1";

    @Test
    void desactivarCortaElAccesoYElAdminPuedeReactivarlo() throws Exception {
        String u = unico();
        String email = "dueno-" + u + "@ejemplo.com";
        JsonNode registro = json(mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of(
                                "business", Map.of("name", "Local " + u, "slug", "local-" + u, "email", "l-" + u + "@ejemplo.com"),
                                "admin", Map.of("fullName", "Dueño " + u, "email", email, "password", CLAVE)))))
                .andExpect(status().isCreated()).andReturn());
        String token = registro.path("token").asString();
        long businessId = json(mockMvc.perform(get("/api/me/businesses").header("Authorization", bearer(token)))
                .andReturn()).get(0).path("businessId").asLong();

        mockMvc.perform(delete("/api/businesses/" + businessId).header("Authorization", bearer(token)))
                .andExpect(status().isNoContent());

        // el mismo token ya no sirve para trabajar con el negocio
        mockMvc.perform(get("/api/businesses/" + businessId + "/clients").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());

        // pero el admin puede volver a entrar (el login le muestra el negocio desactivado) y reactivarlo
        JsonNode login = json(mockMvc.perform(post("/api/auth/token").contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email, "password", CLAVE))))
                .andExpect(status().isOk()).andReturn());
        String nuevo = login.path("token").asString();
        JsonNode negocios = json(mockMvc.perform(get("/api/me/businesses").header("Authorization", bearer(nuevo))).andReturn());
        assertThat(negocios.get(0).path("businessActive").asBoolean()).isFalse();

        mockMvc.perform(patch("/api/businesses/" + businessId + "/reactivate").header("Authorization", bearer(nuevo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true));
        mockMvc.perform(get("/api/businesses/" + businessId + "/clients").header("Authorization", bearer(nuevo)))
                .andExpect(status().isOk());
    }
}
