package br.com.restaurantmanager.identidade.controllers;

import br.com.restaurantmanager.identidade.dtos.AccessResponse;
import br.com.restaurantmanager.identidade.dtos.CsrfResponse;
import br.com.restaurantmanager.identidade.dtos.LoginRequest;
import br.com.restaurantmanager.identidade.dtos.ReautenticacaoRequest;
import br.com.restaurantmanager.identidade.dtos.TokensIdentidade;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.IdentidadeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class IdentidadeController {
    private final IdentidadeService service;

    public IdentidadeController(IdentidadeService service) {
        this.service = service;
    }

    @PostMapping("/reautenticar")
    public void reautenticar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @Valid @RequestBody ReautenticacaoRequest body,
            HttpServletResponse response) {
        service.reautenticar(ator, body.senha());
        response.setStatus(204);
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken csrf) {
        return new CsrfResponse(csrf.getToken(), csrf.getHeaderName());
    }

    @PostMapping("/login")
    public AccessResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        return respond(service.login(body.email(), body.senha(), request.getRemoteAddr()), response);
    }

    @PostMapping("/refresh")
    public AccessResponse refresh(
            @CookieValue(name = "RM_REFRESH", required = false) String token,
            HttpServletResponse response) {
        return respond(service.refresh(token), response);
    }

    @PostMapping("/logout")
    public void logout(@CookieValue(name = "RM_REFRESH", required = false) String token, HttpServletResponse response) {
        service.logout(token);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("", 0).toString());
        response.setStatus(204);
    }

    @GetMapping("/me")
    public IdentidadeAtual me(@AuthenticationPrincipal IdentidadeAtual current) {
        return current;
    }

    private AccessResponse respond(TokensIdentidade tokens, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(tokens.refreshToken(), 43200).toString());
        return new AccessResponse(tokens.accessToken(), tokens.expiresIn());
    }

    private ResponseCookie cookie(String value, long maxAge) {
        return ResponseCookie.from("RM_REFRESH", value).httpOnly(true).secure(true).sameSite("Strict")
                .path("/api/v1/auth").maxAge(maxAge).build();
    }
}
