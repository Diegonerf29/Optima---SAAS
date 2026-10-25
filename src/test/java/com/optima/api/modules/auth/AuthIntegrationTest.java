package com.optima.api.modules.auth;

import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static com.optima.api.support.TestApi.ADMIN_DEMO;
import static com.optima.api.support.TestApi.DEMO_PASSWORD;
import static com.optima.api.support.TestApi.EMPLEADO_DEMO;
import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.toJson;
import static com.optima.api.support.TestApi.tokenDeNegocio;
import static com.optima.api.support.TestApi.unico;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthIntegrationTest extends IntegrationTest {

    @Test
    void loginConVariosNegociosDevuelveTokenDeIdentidad() throws Exception {
        mockMvc.perform(post("/api/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", ADMIN_DEMO, "password", DEMO_PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("identity"))
                .andExpect(jsonPath("$.businesses.length()").value(2));
    }

    @Test
    void contrasenaIncorrectaDa401() throws Exception {
        mockMvc.perform(post("/api/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", ADMIN_DEMO, "password", "otra-clave-1"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Credenciales incorrectas"));
    }

    @Test
    void conTokenDeNegocioSeLeeElNegocio() throws Exception {
        String token = tokenDeNegocio(mockMvc, ADMIN_DEMO, DEMO_PASSWORD, 1);
        mockMvc.perform(get("/api/businesses/1").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void sinTokenDa401EnFormatoComun() throws Exception {
        mockMvc.perform(get("/api/businesses/1/clients"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void empleadoNoPuedeCrearCabinas() throws Exception {
        String token = tokenDeNegocio(mockMvc, EMPLEADO_DEMO, DEMO_PASSWORD, 1);
        mockMvc.perform(post("/api/businesses/1/booths")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("name", "Cabina " + unico()))))
                .andExpect(status().isForbidden());
    }

    @Test
    void registroCreaNegocioYDevuelveTokenDeNegocio() throws Exception {
        String u = unico();
        Map<String, Object> body = Map.of(
                "business", Map.of("name", "Peluqueria " + u, "slug", "peluqueria-" + u, "email", "negocio-" + u + "@ejemplo.com"),
                "admin", Map.of("fullName", "Dueña " + u, "email", "duena-" + u + "@ejemplo.com", "password", "clave-segura-1"));
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tokenType").value("tenant"));
    }

    @Test
    void registroRechazaContrasenaSinNumeros() throws Exception {
        String u = unico();
        Map<String, Object> body = Map.of(
                "business", Map.of("name", "Barberia " + u, "slug", "barberia-" + u, "email", "b-" + u + "@ejemplo.com"),
                "admin", Map.of("fullName", "Dueño " + u, "email", "d-" + u + "@ejemplo.com", "password", "solo-letras"));
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void yaNoSePuedenCrearNegociosSinDuenoConPostBusinesses() throws Exception {
        // regresion de M9: los negocios solo se crean con el registro
        String token = tokenDeNegocio(mockMvc, ADMIN_DEMO, DEMO_PASSWORD, 1);
        String u = unico();
        mockMvc.perform(post("/api/businesses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("name", "Huerfano " + u, "slug", "huerfano-" + u, "email", "h-" + u + "@ejemplo.com"))))
                .andExpect(status().isNotFound());
    }
}
