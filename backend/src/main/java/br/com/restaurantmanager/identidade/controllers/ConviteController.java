package br.com.restaurantmanager.identidade.controllers;

import br.com.restaurantmanager.identidade.dtos.AceitarConviteRequest;
import br.com.restaurantmanager.identidade.dtos.ConviteResumo;
import br.com.restaurantmanager.identidade.dtos.CriarConviteRequest;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.ConviteService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
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

    public ConviteController(ConviteService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/equipe/convites")
    public List<ConviteResumo> listar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.listar(ator, pagina);
    }

    @GetMapping("/api/v1/equipe/convites/{id}")
    public ConviteResumo obter(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.obter(ator, id);
    }

    @PostMapping("/api/v1/equipe/convites")
    public ConviteResumo criar(@AuthenticationPrincipal IdentidadeAtual ator, @Valid @RequestBody CriarConviteRequest body) {
        return service.criar(ator, body.id(), body.email(), body.perfil(), body.unidades());
    }

    @PostMapping("/api/v1/equipe/convites/{id}/revogar")
    public ConviteResumo revogar(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.revogar(ator, id);
    }

    @PostMapping("/api/v1/auth/convites/aceitar")
    public ResponseEntity<Void> aceitar(@Valid @RequestBody AceitarConviteRequest body, HttpServletRequest request) {
        service.aceitar(body.codigo(), body.senha(), request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
