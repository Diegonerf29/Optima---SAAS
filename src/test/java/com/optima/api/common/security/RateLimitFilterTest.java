package com.optima.api.common.security;

import com.optima.api.common.exception.ErrorWriter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

/** regresion de M3: el limite de intentos no se salta con X-Forwarded-For */
class RateLimitFilterTest {

    private final RateLimitFilter filter = new RateLimitFilter(new ErrorWriter(new JsonMapper()), true);

    @Test
    void elUndecimoLoginEnUnMinutoDa429() throws Exception {
        for (int i = 0; i < 10; i++) {
            assertThat(login("1.1.1.1", null).getStatus()).isEqualTo(200);
        }
        MockHttpServletResponse res = login("1.1.1.1", null);
        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(res.getHeader("Retry-After")).isNotBlank();
    }

    @Test
    void cambiarXForwardedForNoReiniciaElLimite() throws Exception {
        for (int i = 0; i < 10; i++) {
            login("2.2.2.2", "9.9.9." + i);
        }
        // el atacante sigue saliendo desde la misma ip aunque invente otra cabecera
        assertThat(login("2.2.2.2", "8.8.8.8").getStatus()).isEqualTo(429);
    }

    @Test
    void otraIpTieneSuPropioLimite() throws Exception {
        for (int i = 0; i < 11; i++) {
            login("3.3.3.3", null);
        }
        assertThat(login("4.4.4.4", null).getStatus()).isEqualTo(200);
    }

    @Test
    void lasLecturasNoSeLimitan() throws Exception {
        for (int i = 0; i < 50; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/me");
            req.setRemoteAddr("5.5.5.5");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, new MockFilterChain());
            assertThat(res.getStatus()).isEqualTo(200);
        }
    }

    @Test
    void desactivadoNoLimitaNada() throws Exception {
        RateLimitFilter apagado = new RateLimitFilter(new ErrorWriter(new JsonMapper()), false);
        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/token");
            MockHttpServletResponse res = new MockHttpServletResponse();
            apagado.doFilter(req, res, new MockFilterChain());
            assertThat(res.getStatus()).isEqualTo(200);
        }
    }

    private MockHttpServletResponse login(String ip, String xForwardedFor) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/token");
        req.setRemoteAddr(ip);
        if (xForwardedFor != null) {
            req.addHeader("X-Forwarded-For", xForwardedFor);
        }
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res;
    }
}
