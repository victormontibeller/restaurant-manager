package br.com.restaurantmanager.plataforma.controllers;

import br.com.restaurantmanager.identidade.dtos.AccessResponse;
import br.com.restaurantmanager.identidade.dtos.CsrfResponse;
import br.com.restaurantmanager.identidade.dtos.LoginRequest;
import br.com.restaurantmanager.identidade.dtos.ReautenticacaoRequest;
import br.com.restaurantmanager.plataforma.dtos.AlterarEstadoEmpresa;
import br.com.restaurantmanager.plataforma.dtos.EmpresaPlataforma;
import br.com.restaurantmanager.plataforma.dtos.IdentidadePlataforma;
import br.com.restaurantmanager.plataforma.dtos.TokensPlataforma;
import br.com.restaurantmanager.plataforma.services.PlataformaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/plataforma")
public class PlataformaController {
    private final PlataformaService service;

    public PlataformaController(PlataformaService service) {
        this.service = service;
    }

    @GetMapping("/auth/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getToken(), token.getHeaderName());
    }

    @PostMapping("/auth/login")
    public AccessResponse login(
            @Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        return responder(service.login(body.email(), body.senha(), request.getRemoteAddr()), response);
    }

    @PostMapping("/auth/refresh")
    public AccessResponse refresh(
            @CookieValue(name = "RM_PLATFORM_REFRESH", required = false) String token,
            HttpServletResponse response) {
        return responder(service.refresh(token), response);
    }

    @PostMapping("/auth/logout")
    public void logout(
            @CookieValue(name = "RM_PLATFORM_REFRESH", required = false) String token,
            HttpServletResponse response) {
        service.logout(token);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("", 0).toString());
        response.setStatus(204);
    }

    @GetMapping("/auth/me")
    public IdentidadePlataforma me(@AuthenticationPrincipal IdentidadePlataforma ator) {
        return ator;
    }

    @GetMapping("/empresas")
    public List<EmpresaPlataforma> empresas(
            @AuthenticationPrincipal IdentidadePlataforma ator,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.empresas(ator, pagina);
    }

    @GetMapping("/empresas/{id}")
    public EmpresaPlataforma empresa(@AuthenticationPrincipal IdentidadePlataforma ator, @PathVariable UUID id) {
        return service.empresa(ator, id);
    }

    @PutMapping("/empresas/{id}/estado")
    public EmpresaPlataforma estado(
            @AuthenticationPrincipal IdentidadePlataforma ator, @PathVariable UUID id,
            @Valid @RequestBody AlterarEstadoEmpresa body) {
        return service.alterarEstado(ator, id, body.versao(), body.estado(), body.motivo());
    }

    @PostMapping("/auth/reautenticar")
    public void reautenticar(
            @AuthenticationPrincipal IdentidadePlataforma ator,
            @Valid @RequestBody ReautenticacaoRequest body, HttpServletResponse response) {
        service.reautenticar(ator, body.senha());
        response.setStatus(204);
    }

    private AccessResponse responder(TokensPlataforma tokens, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(tokens.refreshToken(), 43200).toString());
        return new AccessResponse(tokens.accessToken(), tokens.expiresIn());
    }

    private ResponseCookie cookie(String value, long seconds) {
        return ResponseCookie.from("RM_PLATFORM_REFRESH", value)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/api/v1/plataforma/auth")
                .maxAge(seconds)
                .build();
    }
}
