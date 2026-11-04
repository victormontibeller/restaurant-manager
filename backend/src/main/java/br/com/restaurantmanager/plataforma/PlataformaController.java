package br.com.restaurantmanager.plataforma;

import br.com.restaurantmanager.identidade.IdentidadeController.Access;
import br.com.restaurantmanager.identidade.IdentidadeController.Csrf;
import br.com.restaurantmanager.identidade.IdentidadeController.Login;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/plataforma")
public class PlataformaController {
    private final PlataformaService service;
    public PlataformaController(PlataformaService service) { this.service=service; }
    @GetMapping("/auth/csrf") public Csrf csrf(CsrfToken token) { return new Csrf(token.getToken(),token.getHeaderName()); }
    @PostMapping("/auth/login") public Access login(@Valid @RequestBody Login body,HttpServletRequest request,HttpServletResponse response) {
        return responder(service.login(body.email(),body.senha(),request.getRemoteAddr()),response);
    }
    @PostMapping("/auth/refresh") public Access refresh(@CookieValue(name="RM_PLATFORM_REFRESH",required=false) String token,HttpServletResponse response) { return responder(service.refresh(token),response); }
    @PostMapping("/auth/logout") public void logout(@CookieValue(name="RM_PLATFORM_REFRESH",required=false) String token,HttpServletResponse response) {
        service.logout(token);response.addHeader(HttpHeaders.SET_COOKIE,cookie("",0).toString());response.setStatus(204);
    }
    @GetMapping("/auth/me") public PlataformaService.Identidade me(@AuthenticationPrincipal PlataformaService.Identidade ator) { return ator; }
    @GetMapping("/empresas") public List<PlataformaRepository.Empresa> empresas(@AuthenticationPrincipal PlataformaService.Identidade ator,@RequestParam(defaultValue="0") int pagina) { return service.empresas(ator,pagina); }
    private Access responder(PlataformaService.Tokens tokens,HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE,cookie(tokens.refreshToken(),43200).toString());return new Access(tokens.accessToken(),tokens.expiresIn());
    }
    private ResponseCookie cookie(String value,long seconds) {
        return ResponseCookie.from("RM_PLATFORM_REFRESH",value).httpOnly(true).secure(true).sameSite("Strict").path("/api/v1/plataforma/auth").maxAge(seconds).build();
    }
}
