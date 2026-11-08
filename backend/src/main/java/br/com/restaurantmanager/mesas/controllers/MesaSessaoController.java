package br.com.restaurantmanager.mesas.controllers;

import br.com.restaurantmanager.identidade.dtos.AccessResponse;
import br.com.restaurantmanager.identidade.dtos.CsrfResponse;
import br.com.restaurantmanager.mesas.dtos.AutorizarMesa;
import br.com.restaurantmanager.mesas.dtos.TokensMesa;
import br.com.restaurantmanager.mesas.services.MesaSessaoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/mesa/auth")
public class MesaSessaoController {
    private final MesaSessaoService service;

    public MesaSessaoController(MesaSessaoService service) {
        this.service = service;
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getToken(), token.getHeaderName());
    }

    @PostMapping("/autorizar")
    public AccessResponse autorizar(@Valid @RequestBody AutorizarMesa body, HttpServletRequest request, HttpServletResponse response) {
        return resposta(service.autorizar(body.mesaId(), body.codigo(), request.getRemoteAddr()), response);
    }

    @PostMapping("/refresh")
    public AccessResponse refresh(@CookieValue(name = "RM_MESA_REFRESH", required = false) String token, HttpServletResponse response) {
        return resposta(service.refresh(token), response);
    }

    @PostMapping("/logout")
    public void logout(@CookieValue(name = "RM_MESA_REFRESH", required = false) String token, HttpServletResponse response) {
        service.logout(token);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("", 0).toString());
        response.setStatus(204);
    }

    private AccessResponse resposta(TokensMesa tokens, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(tokens.refreshToken(), 43200).toString());
        return new AccessResponse(tokens.accessToken(), tokens.expiresIn());
    }

    private ResponseCookie cookie(String token, long segundos) {
        return ResponseCookie.from("RM_MESA_REFRESH", token).secure(true).httpOnly(true).sameSite("Strict")
                .path("/api/v1/mesa/auth").maxAge(segundos).build();
    }
}
