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

import static com.optima.api.support.TestApi.toJson;
import static com.optima.api.support.TestApi.unico;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** regresion de M6: solo vale el ultimo enlace y cada enlace se usa una vez */
class PasswordResetIntegrationTest extends IntegrationTest {

    private static final Pattern TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");

    @MockitoBean
    private MailService mailService;

    @Test
    void soloValeElUltimoEnlaceYUnaSolaVez() throws Exception {
        String email = registrar();

        String primero = pedirEnlace(email);
        String segundo = pedirEnlace(email);

        // el primer enlace ya no sirve porque se pidio otro
        restablecer(primero, "nueva-clave-1").andExpect(status().isBadRequest());
        restablecer(segundo, "nueva-clave-2").andExpect(status().isNoContent());
        // y el segundo no se puede reutilizar
        restablecer(segundo, "nueva-clave-3").andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/token").contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email, "password", "nueva-clave-2"))))
                .andExpect(status().isOk());
    }

    @Test
    void emailDesconocidoRespondeIgualYNoEnviaNada() throws Exception {
        clearInvocations(mailService);
        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", "nadie-" + unico() + "@ejemplo.com"))))
                .andExpect(status().isNoContent());
        verify(mailService, never()).sendSimpleEmail(anyString(), anyString(), anyString());
    }

    @Test
    void tokenInventadoDa400() throws Exception {
        restablecer("token-que-no-existe", "nueva-clave-1").andExpect(status().isBadRequest());
    }

    private String pedirEnlace(String email) throws Exception {
        clearInvocations(mailService);
        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email))))
                .andExpect(status().isNoContent());
        ArgumentCaptor<String> cuerpo = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendSimpleEmail(eq(email), anyString(), cuerpo.capture());
        Matcher m = TOKEN.matcher(cuerpo.getValue());
        if (!m.find()) {
            throw new AssertionError("El correo no trae el enlace");
        }
        return m.group(1);
    }

    private org.springframework.test.web.servlet.ResultActions restablecer(String token, String clave) throws Exception {
        return mockMvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(toJson(Map.of("token", token, "newPassword", clave))));
    }

    private String registrar() throws Exception {
        String u = unico();
        String email = "reset-" + u + "@ejemplo.com";
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(toJson(Map.of(
                        "business", Map.of("name", "Local " + u, "slug", "local-" + u, "email", "l-" + u + "@ejemplo.com"),
                        "admin", Map.of("fullName", "Persona " + u, "email", email, "password", "clave-segura-1")))))
                .andExpect(status().isCreated());
        return email;
    }
}
