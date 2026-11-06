package br.com.restaurantmanager.identidade;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/verificacao")
public class VerificacaoEmailController {
    private final VerificacaoEmailService service;
    public VerificacaoEmailController(VerificacaoEmailService service) {this.service=service;}
    public record Solicitacao(@NotBlank @Email @Size(max=254) @Pattern(regexp="[^\\s\\p{Cntrl}]+") String email) {
        @Override public String toString() {return "SolicitacaoVerificacao[protegida]";}
    }
    public record Confirmacao(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String codigo) {
        @Override public String toString() {return "ConfirmacaoVerificacao[protegida]";}
    }
    public record Resposta(String mensagem) {}
    @PostMapping public ResponseEntity<Resposta> solicitar(@Valid @RequestBody Solicitacao body,HttpServletRequest request) {
        service.solicitar(body.email(),request.getRemoteAddr());
        return ResponseEntity.accepted().body(new Resposta("Se a conta estiver elegível, enviaremos instruções para verificar o e-mail."));
    }
    @PostMapping("/confirmar") public ResponseEntity<Void> confirmar(@Valid @RequestBody Confirmacao body,HttpServletRequest request) {
        service.confirmar(body.codigo(),request.getRemoteAddr());return ResponseEntity.noContent().build();
    }
}
