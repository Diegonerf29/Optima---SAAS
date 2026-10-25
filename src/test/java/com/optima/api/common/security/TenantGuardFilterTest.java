package com.optima.api.common.security;

import com.optima.api.common.exception.ErrorWriter;
import com.optima.api.modules.billing.service.BillingService;
import com.optima.api.modules.business.model.Business;
import com.optima.api.modules.business.model.Membership;
import com.optima.api.modules.business.model.Role;
import com.optima.api.modules.business.repository.MembershipRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TenantGuardFilterTest {

    private MembershipRepository membershipRepository;
    private BillingService billingService;
    private TenantGuardFilter filter;

    @BeforeEach
    void setUp() {
        membershipRepository = mock(MembershipRepository.class);
        billingService = mock(BillingService.class);
        // por defecto la suscripcion esta al dia
        when(billingService.hasAccess(any())).thenReturn(true);
        filter = new TenantGuardFilter(new ErrorWriter(new JsonMapper()), membershipRepository, billingService);
    }

    @Test
    void sinSuscripcionSoloSeVeElNegocioYSusPagos() throws Exception {
        autenticar(1L, "ADMIN");
        when(membershipRepository.findForSessionGuard(10L, 1L)).thenReturn(Optional.of(membresia(true, "ADMIN")));
        when(billingService.hasAccess(any())).thenReturn(false);

        assertThat(ejecutar("/api/businesses/1/clients").getStatus()).isEqualTo(402);
        assertThat(ejecutar("PUT", "/api/businesses/1").getStatus()).isEqualTo(402);
        assertThat(ejecutar("/api/businesses/1").getStatus()).isEqualTo(200);
        assertThat(ejecutar("/api/businesses/1/billing").getStatus()).isEqualTo(200);
        assertThat(ejecutar("POST", "/api/businesses/1/billing/checkout").getStatus()).isEqualTo(200);
        // una ruta que solo empieza igual no cuela
        assertThat(ejecutar("/api/businesses/1/billingx").getStatus()).isEqualTo(402);
    }

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void dejaPasarAlNegocioDelToken() throws Exception {
        autenticar(1L, "ADMIN");
        when(membershipRepository.findForSessionGuard(10L, 1L)).thenReturn(Optional.of(membresia(true, "ADMIN")));

        MockHttpServletResponse res = ejecutar("/api/businesses/1/clients");

        assertThat(res.getStatus()).isEqualTo(200);
    }

    @Test
    void bloqueaOtroNegocio() throws Exception {
        autenticar(1L, "ADMIN");

        MockHttpServletResponse res = ejecutar("/api/businesses/2/clients");

        assertThat(res.getStatus()).isEqualTo(403);
    }

    @Test
    void bloqueaTokenSinNegocioElegido() throws Exception {
        autenticar(null, null);

        MockHttpServletResponse res = ejecutar("/api/businesses/1/clients");

        assertThat(res.getStatus()).isEqualTo(403);
    }

    @Test
    void membresiaDesactivadaDa401() throws Exception {
        autenticar(1L, "ADMIN");
        when(membershipRepository.findForSessionGuard(10L, 1L)).thenReturn(Optional.of(membresia(false, "ADMIN")));

        MockHttpServletResponse res = ejecutar("/api/businesses/1/clients");

        assertThat(res.getStatus()).isEqualTo(401);
    }

    @Test
    void membresiaBorradaDa401() throws Exception {
        autenticar(1L, "ADMIN");
        when(membershipRepository.findForSessionGuard(10L, 1L)).thenReturn(Optional.empty());

        MockHttpServletResponse res = ejecutar("/api/businesses/1/clients");

        assertThat(res.getStatus()).isEqualTo(401);
    }

    @Test
    void rolCambiadoDa401() throws Exception {
        autenticar(1L, "ADMIN");
        when(membershipRepository.findForSessionGuard(10L, 1L)).thenReturn(Optional.of(membresia(true, "EMPLOYEE")));

        MockHttpServletResponse res = ejecutar("/api/businesses/1/clients");

        assertThat(res.getStatus()).isEqualTo(401);
    }

    @Test
    void idDeNegocioNoNumericoDa403() throws Exception {
        autenticar(1L, "ADMIN");

        MockHttpServletResponse res = ejecutar("/api/businesses/abc/clients");

        assertThat(res.getStatus()).isEqualTo(403);
    }

    @Test
    void rutasFueraDeNegocioNoSeComprueban() throws Exception {
        autenticar(1L, "ADMIN");

        MockHttpServletResponse res = ejecutar("/api/me");

        assertThat(res.getStatus()).isEqualTo(200);
    }

    // negocio desactivado (M4)

    @Test
    void negocioDesactivadoBloqueaElRestoDeRutas() throws Exception {
        autenticar(1L, "ADMIN");
        when(membershipRepository.findForSessionGuard(10L, 1L)).thenReturn(Optional.of(membresia(true, "ADMIN", false)));

        assertThat(ejecutar("/api/businesses/1/clients").getStatus()).isEqualTo(403);
        assertThat(ejecutar("POST", "/api/businesses/1/appointments").getStatus()).isEqualTo(403);
    }

    @Test
    void negocioDesactivadoSePuedeVerYReactivar() throws Exception {
        autenticar(1L, "ADMIN");
        when(membershipRepository.findForSessionGuard(10L, 1L)).thenReturn(Optional.of(membresia(true, "ADMIN", false)));

        assertThat(ejecutar("/api/businesses/1").getStatus()).isEqualTo(200);
        assertThat(ejecutar("PATCH", "/api/businesses/1/reactivate").getStatus()).isEqualTo(200);
        assertThat(ejecutar("PUT", "/api/businesses/1").getStatus()).isEqualTo(403);
    }

    private MockHttpServletResponse ejecutar(String uri) throws Exception {
        return ejecutar("GET", uri);
    }

    private MockHttpServletResponse ejecutar(String method, String uri) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(method, uri);
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res;
    }

    private static void autenticar(Long businessId, String role) {
        AuthPrincipal principal = new AuthPrincipal(10L, businessId, "ana@ejemplo.com", role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private static Membership membresia(boolean activa, String rol) {
        return membresia(activa, rol, true);
    }

    private static Membership membresia(boolean activa, String rol, boolean negocioActivo) {
        Role role = new Role();
        role.setName(rol);
        Business business = new Business();
        business.setIsActive(negocioActivo);
        Membership m = new Membership();
        m.setIsActive(activa);
        m.setRole(role);
        m.setBusiness(business);
        return m;
    }
}
