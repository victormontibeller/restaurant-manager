package br.com.restaurantmanager.mesas.controllers;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.mesas.dtos.AberturaAtendimento;
import br.com.restaurantmanager.mesas.dtos.AlterarMesa;
import br.com.restaurantmanager.mesas.dtos.CriarMesa;
import br.com.restaurantmanager.mesas.dtos.IntencaoAtendimento;
import br.com.restaurantmanager.mesas.dtos.MesaResumo;
import br.com.restaurantmanager.mesas.dtos.SolicitacaoMesa;
import br.com.restaurantmanager.mesas.dtos.VersaoComanda;
import br.com.restaurantmanager.mesas.services.MesaService;
import br.com.restaurantmanager.mesas.services.SolicitacaoMesaService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/operacao/mesas")
public class MesaController {
    private final MesaService service;
    private final SolicitacaoMesaService solicitacoes;

    public MesaController(MesaService service, SolicitacaoMesaService solicitacoes) {
        this.service = service;
        this.solicitacoes = solicitacoes;
    }

    @GetMapping
    public List<MesaResumo> listar(@AuthenticationPrincipal IdentidadeAtual ator, @RequestParam UUID unidadeId,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.listar(ator, unidadeId, pagina);
    }

    @PostMapping
    public MesaResumo criar(@AuthenticationPrincipal IdentidadeAtual ator, @Valid @RequestBody CriarMesa body) {
        return service.criar(ator, body);
    }

    @PutMapping("/{id}")
    public MesaResumo alterar(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id, @Valid @RequestBody AlterarMesa body) {
        return service.alterar(ator, id, body);
    }

    @PostMapping("/{id}/abrir")
    public AberturaAtendimento abrir(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @Valid @RequestBody IntencaoAtendimento body) {
        return service.abrir(ator, id, body.intencaoId());
    }

    @PostMapping("/{id}/codigo")
    public AberturaAtendimento codigo(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @Valid @RequestBody VersaoComanda body) {
        return service.codigo(ator, id, body.versao());
    }

    @GetMapping("/solicitacoes")
    public List<SolicitacaoMesa> listarSolicitacoes(@AuthenticationPrincipal IdentidadeAtual ator, @RequestParam UUID unidadeId,
            @RequestParam(defaultValue = "0") int pagina) {
        return solicitacoes.listar(ator, unidadeId, pagina);
    }

    @PostMapping("/solicitacoes/{id}/atender")
    public SolicitacaoMesa atender(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @Valid @RequestBody VersaoComanda body) {
        return solicitacoes.atender(ator, id, body.versao());
    }
}
