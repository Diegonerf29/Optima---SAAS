package com.optima.api.modules.auth;

import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.Map;

import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static com.optima.api.support.TestApi.unico;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** regresion de M5: los tokens se pueden revocar y el email no se cambia sin contraseña */
class SessionRevocationIntegrationTest extends IntegrationTest {

    private static final String CLAVE = "clave-segura-1";

    @Test
    void cerrarSesionEnTodosLosDispositivosInvalidaElToken() throws Exception {
        String email = registrar();
        String token = login(email, CLAVE);
        mockMvc.perform(get("/api/me").header("Authorization", bearer(token))).andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/logout-all").header("Authorization", bearer(token)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/me").header("Authorization", bearer(token))).andExpect(status().isUnauthorized());
        // un login nuevo funciona
        mockMvc.perform(get("/api/me").header("Authorization", bearer(login(email, CLAVE)))).andExpect(status().isOk());
    }

    @Test
    void cambiarLaContrasenaCierraLasSesionesAnteriores() throws Exception {
        String email = registrar();
        String token = login(email, CLAVE);

        mockMvc.perform(put("/api/me/password")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("currentPassword", CLAVE, "newPassword", "nueva-clave-2"))))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/me").header("Authorization", bearer(token))).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/me").header("Authorization", bearer(login(email, "nueva-clave-2")))).andExpect(status().isOk());
    }

    @Test
    void cambiarElEmailExigeLaContrasenaActual() throws Exception {
        String email = registrar();
        String token = login(email, CLAVE);
        String nuevo = "nuevo-" + unico() + "@ejemplo.com";

        Map<String, Object> sinClave = new HashMap<>(Map.of("fullName", "Nombre", "email", nuevo));
        mockMvc.perform(put("/api/me").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(toJson(sinClave)))
                .andExpect(status().isBadRequest());

        Map<String, Object> claveMala = new HashMap<>(sinClave);
        claveMala.put("currentPassword", "otra-clave-3");
        mockMvc.perform(put("/api/me").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(toJson(claveMala)))
                .andExpect(status().isBadRequest());

        Map<String, Object> conClave = new HashMap<>(sinClave);
        conClave.put("currentPassword", CLAVE);
        mockMvc.perform(put("/api/me").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(toJson(conClave)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(nuevo));
    }

    @Test
    void cambiarSoloElNombreNoPideContrasena() throws Exception {
        String email = registrar();
        String token = login(email, CLAVE);
        mockMvc.perform(put("/api/me").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("fullName", "Otro Nombre", "email", email))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Otro Nombre"));
    }

    private String registrar() throws Exception {
        String u = unico();
        String email = "sesion-" + u + "@ejemplo.com";
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(toJson(Map.of(
                        "business", Map.of("name", "Local " + u, "slug", "local-" + u, "email", "l-" + u + "@ejemplo.com"),
                        "admin", Map.of("fullName", "Persona " + u, "email", email, "password", CLAVE)))))
                .andExpect(status().isCreated());
        return email;
    }

    private String login(String email, String clave) throws Exception {
        return json(mockMvc.perform(post("/api/auth/token").contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email, "password", clave))))
                .andExpect(status().isOk()).andReturn()).path("token").asString();
    }
}
