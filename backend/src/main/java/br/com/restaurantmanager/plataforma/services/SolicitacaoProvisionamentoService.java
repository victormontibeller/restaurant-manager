package br.com.restaurantmanager.plataforma.services;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.plataforma.dtos.IdentidadePlataforma;
import br.com.restaurantmanager.plataforma.dtos.PedidoProvisionamento;
import br.com.restaurantmanager.plataforma.dtos.RegistroSolicitacaoProvisionamento;
import br.com.restaurantmanager.plataforma.dtos.ResumoSolicitacaoProvisionamento;
import br.com.restaurantmanager.plataforma.models.DominioPlataforma;
import br.com.restaurantmanager.plataforma.repositories.PlataformaRepository;
import br.com.restaurantmanager.plataforma.repositories.SolicitacaoProvisionamentoRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SolicitacaoProvisionamentoService {
    private final PlataformaService plataforma;
    private final PlataformaRepository identidade;
    private final SolicitacaoProvisionamentoRepository repository;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);
    private final DominioPlataforma dominio;

    public SolicitacaoProvisionamentoService(
            PlataformaService plataforma, PlataformaRepository identidade,
            SolicitacaoProvisionamentoRepository repository,
            @Value(DominioPlataforma.CONFIGURACAO) String platformHost) {
        this.plataforma = plataforma;
        this.identidade = identidade;
        this.repository = repository;
        this.dominio = new DominioPlataforma(platformHost);
    }

    public ResumoSolicitacaoProvisionamento solicitar(IdentidadePlataforma ator, PedidoProvisionamento pedido) {
        return plataforma.executar(() -> {
            plataforma.autorizar(ator, true);
            try {
                ProvisionamentoService.validar(pedido);
            } catch (IllegalArgumentException failure) {
                throw new AuthFailure(400, "ENTRADA_INVALIDA", failure.getMessage());
            }
            if (dominio.reservado(pedido.host())) {
                throw new AuthFailure(409, "DOMINIO_RESERVADO", "Domínio indisponível para empresa.");
            }
            repository.bloquear(pedido.id());
            plataforma.autorizar(ator, true);
            var existente = repository.buscar(pedido.id());
            if (existente != null) {
                if (!existente.operador().equals(ator.usuarioId()) || !existente.nome().equals(pedido.nome())
                        || !existente.host().equals(pedido.host()) || !existente.unidade().equals(pedido.unidade())
                        || !existente.email().equals(pedido.email()) || !passwords.matches(pedido.senha(), existente.hash())) {
                    throw conflito();
                }
                return resumo(existente);
            }
            if (identidade.tentativa("provisionar:" + ator.usuarioId(), Instant.now()) > 10) {
                throw new AuthFailure(429, "LIMITE_TENTATIVAS",
                        "Limite de dez solicitações em quinze minutos. Aguarde.");
            }
            String hash = passwords.encode(pedido.senha());
            plataforma.autorizar(ator, true);
            // Mesmo lock do CLI/worker: um domínio não pode ganhar duas reservas.
            // A API não aguarda uma migração longa mantendo locks de identidade.
            if (!repository.bloquearReserva()) {
                throw new AuthFailure(409, "PROVISIONADOR_OCUPADO",
                        "Provisionador ocupado. Consulte ou reenvie a mesma intenção mais tarde.");
            }
            if (repository.ocupado(pedido.id(), pedido.host())) {
                throw conflito();
            }
            if (!repository.inserir(pedido, ator.usuarioId(), hash)) {
                throw conflito();
            }
            repository.auditar(pedido.id(), ator, "SOLICITADO", 0);
            return resumo(repository.buscar(pedido.id()));
        });
    }

    public List<ResumoSolicitacaoProvisionamento> listar(IdentidadePlataforma ator, int pagina) {
        return plataforma.executar(() -> {
            plataforma.autorizar(ator, false);
            if (pagina < 0 || pagina > 10000) {
                throw new AuthFailure(400, "PAGINA_INVALIDA", "Página inválida.");
            }
            return repository.listar(pagina);
        });
    }

    public ResumoSolicitacaoProvisionamento consultar(IdentidadePlataforma ator, UUID id) {
        return plataforma.executar(() -> {
            plataforma.autorizar(ator, false);
            return resumo(localizar(id));
        });
    }

    public ResumoSolicitacaoProvisionamento retomar(IdentidadePlataforma ator, UUID id, long versao) {
        return plataforma.executar(() -> {
            plataforma.autorizar(ator, true);
            repository.bloquear(id);
            plataforma.autorizar(ator, true);
            localizar(id);
            if (!repository.retomar(id, versao)) {
                throw conflito();
            }
            repository.auditar(id, ator, "RETOMADA", versao + 1);
            return resumo(repository.buscar(id));
        });
    }

    private RegistroSolicitacaoProvisionamento localizar(UUID id) {
        var registro = repository.buscar(id);
        if (registro == null) {
            throw new AuthFailure(404, "RECURSO_NAO_ENCONTRADO", "Solicitação não encontrada.");
        }
        return registro;
    }

    private static ResumoSolicitacaoProvisionamento resumo(RegistroSolicitacaoProvisionamento registro) {
        return new ResumoSolicitacaoProvisionamento(registro.id(), registro.nome(), registro.host(),
                registro.estado(), registro.versao(), registro.falha());
    }

    private static AuthFailure conflito() {
        return new AuthFailure(409, "CONFLITO_PROVISIONAMENTO",
                "Identificador, domínio, dados ou versão conflitantes. Consulte a solicitação antes de repetir.");
    }
}
