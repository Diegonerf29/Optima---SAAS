package com.optima.api.modules.auth;

import com.optima.api.common.mail.MailService;
import com.optima.api.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.optima.api.support.TestApi.ADMIN_DEMO;
import static com.optima.api.support.TestApi.bearer;
import static com.optima.api.support.TestApi.json;
import static com.optima.api.support.TestApi.toJson;
import static com.optima.api.support.TestApi.unico;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** P4: confirmacion del email al registrarse y al cambiarlo */
class EmailVerificationIntegrationTest extends IntegrationTest {

    private static final Pattern TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final String CLAVE = "clave-segura-1";

    @MockitoBean
    private MailService mailService;

    @Test
    void elEnlaceDelCorreoDeBienvenidaConfirmaElEmail() throws Exception {
        clearInvocations(mailService);
        String email = "verifica-" + unico() + "@ejemplo.com";
        String token = registrar(email);
        mockMvc.perform(get("/api/me").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.emailVerified").value(false));

        String codigo = codigoEnviadoA(email);
        verificar(codigo).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/me").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.emailVerified").value(true));
        // el enlace no se puede usar dos veces
        verificar(codigo).andExpect(status().isBadRequest());
    }

    @Test
    void reenviarAnulaElEnlaceAnterior() throws Exception {
        clearInvocations(mailService);
        String email = "reenvio-" + unico() + "@ejemplo.com";
        String token = registrar(email);
        String primero = codigoEnviadoA(email);

        clearInvocations(mailService);
        mockMvc.perform(post("/api/auth/verify-email/resend").header("Authorization", bearer(token)))
                .andExpect(status().isNoContent());
        String segundo = codigoEnviadoA(email);

        verificar(primero).andExpect(status().isBadRequest());
        verificar(segundo).andExpect(status().isNoContent());
    }

    @Test
    void sinConfirmarElEmailNoSePuedeInvitarAOtraCuenta() throws Exception {
        String token = registrar("sin-confirmar-" + unico() + "@ejemplo.com");
        long businessId = json(mockMvc.perform(get("/api/me/businesses").header("Authorization", bearer(token)))
                .andReturn()).get(0).path("businessId").asLong();

        mockMvc.perform(post("/api/businesses/" + businessId + "/users")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("roleId", 2, "fullName", "x", "email", ADMIN_DEMO, "password", "otra-clave-9"))))
                .andExpect(status().isForbidden());

        // un empleado con email nuevo si se puede crear
        mockMvc.perform(post("/api/businesses/" + businessId + "/users")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("roleId", 2, "fullName", "Recepcion", "email", "recepcion-" + unico() + "@ejemplo.com", "password", "otra-clave-9"))))
                .andExpect(status().isCreated());
    }

    @Test
    void cambiarElEmailObligaAConfirmarloOtraVez() throws Exception {
        String email = "cambia-" + unico() + "@ejemplo.com";
        String token = registrar(email);
        verificar(codigoEnviadoA(email)).andExpect(status().isNoContent());

        String nuevo = "nuevo-" + unico() + "@ejemplo.com";
        clearInvocations(mailService);
        mockMvc.perform(put("/api/me").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("fullName", "Persona", "email", nuevo, "currentPassword", CLAVE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(false));

        verificar(codigoEnviadoA(nuevo)).andExpect(status().isNoContent());
    }

    private String registrar(String email) throws Exception {
        String u = unico();
        return json(mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(toJson(Map.of(
                        "business", Map.of("name", "Local " + u, "slug", "local-" + u, "email", "l-" + u + "@ejemplo.com"),
                        "admin", Map.of("fullName", "Persona " + u, "email", email, "password", CLAVE)))))
                .andExpect(status().isCreated()).andReturn()).path("token").asString();
    }

    private String codigoEnviadoA(String email) {
        ArgumentCaptor<String> cuerpo = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendSimpleEmail(eq(email), anyString(), cuerpo.capture());
        Matcher m = TOKEN.matcher(cuerpo.getValue());
        if (!m.find()) {
            throw new AssertionError("El correo no trae el enlace de confirmación");
        }
        return m.group(1);
    }

    private org.springframework.test.web.servlet.ResultActions verificar(String codigo) throws Exception {
        return mockMvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                .content(toJson(Map.of("token", codigo))));
    }
}
