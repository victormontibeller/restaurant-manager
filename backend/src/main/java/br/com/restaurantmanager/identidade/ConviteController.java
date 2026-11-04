package br.com.restaurantmanager.identidade;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ConviteController {
    private final ConviteService service;
    public ConviteController(ConviteService service){this.service=service;}
    public record Criar(@NotNull UUID id,@NotBlank @Email @Size(max=254) @Pattern(regexp="[^\\s\\p{Cntrl}]+") String email,
            @NotBlank @Size(max=20) String perfil,@NotNull @Size(max=100) Set<@NotNull UUID> unidades) {
        @Override public String toString(){return "CriarConvite[protegido]";}
    }
    public record Aceitar(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String codigo,@NotBlank @Size(min=12,max=72) String senha) {
        @Override public String toString(){return "AceitarConvite[protegido]";}
    }
    @GetMapping("/api/v1/equipe/convites")
    public List<ConviteService.Resumo> listar(@AuthenticationPrincipal IdentidadeAtual ator,@RequestParam(defaultValue="0") int pagina){return service.listar(ator,pagina);}
    @GetMapping("/api/v1/equipe/convites/{id}")
    public ConviteService.Resumo obter(@AuthenticationPrincipal IdentidadeAtual ator,@PathVariable UUID id){return service.obter(ator,id);}
    @PostMapping("/api/v1/equipe/convites")
    public ConviteService.Resumo criar(@AuthenticationPrincipal IdentidadeAtual ator,@Valid @RequestBody Criar body){return service.criar(ator,body.id(),body.email(),body.perfil(),body.unidades());}
    @PostMapping("/api/v1/equipe/convites/{id}/revogar")
    public ConviteService.Resumo revogar(@AuthenticationPrincipal IdentidadeAtual ator,@PathVariable UUID id){return service.revogar(ator,id);}
    @PostMapping("/api/v1/auth/convites/aceitar")
    public ResponseEntity<Void> aceitar(@Valid @RequestBody Aceitar body,HttpServletRequest request){service.aceitar(body.codigo(),body.senha(),request.getRemoteAddr());return ResponseEntity.noContent().build();}
}
