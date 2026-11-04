package br.com.restaurantmanager.identidade;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
    public IdentidadeController(IdentidadeService service) { this.service = service; }
    public record Login(@NotBlank @Email @Size(max=254) String email, @NotBlank @Size(max=72) String senha) {
        @Override public String toString() { return "Login[protegido]"; }
    }
    public record Access(String accessToken, long expiresIn) {
        @Override public String toString() { return "Access[protegido]"; }
    }
    public record Csrf(String token, String headerName) {}
    public record Confirmacao(@NotBlank @Size(max=72) String senha) {
        @Override public String toString() { return "Confirmacao[protegida]"; }
    }
    @PostMapping("/reautenticar") public void reautenticar(@AuthenticationPrincipal IdentidadeAtual ator, @Valid @RequestBody Confirmacao body, HttpServletResponse response) {
        service.reautenticar(ator, body.senha()); response.setStatus(204);
    }
    @GetMapping("/csrf") public Csrf csrf(CsrfToken csrf) { return new Csrf(csrf.getToken(), csrf.getHeaderName()); }
    @PostMapping("/login") public Access login(@Valid @RequestBody Login body, HttpServletRequest request, HttpServletResponse response) {
        return respond(service.login(body.email(), body.senha(), request.getRemoteAddr()), response);
    }
    @PostMapping("/refresh") public Access refresh(@CookieValue(name="RM_REFRESH", required=false) String token, HttpServletResponse response) {
        return respond(service.refresh(token), response);
    }
    @PostMapping("/logout") public void logout(@CookieValue(name="RM_REFRESH", required=false) String token, HttpServletResponse response) {
        service.logout(token); response.addHeader(HttpHeaders.SET_COOKIE, cookie("", 0).toString()); response.setStatus(204);
    }
    @GetMapping("/me") public IdentidadeAtual me(@AuthenticationPrincipal IdentidadeAtual current) { return current; }
    private Access respond(IdentidadeService.Tokens tokens, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(tokens.refreshToken(), 43200).toString());
        return new Access(tokens.accessToken(), tokens.expiresIn());
    }
    private ResponseCookie cookie(String value, long maxAge) {
        return ResponseCookie.from("RM_REFRESH", value).httpOnly(true).secure(true).sameSite("Strict")
                .path("/api/v1/auth").maxAge(maxAge).build();
    }
}
