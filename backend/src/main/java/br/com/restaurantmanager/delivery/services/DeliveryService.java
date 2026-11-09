package br.com.restaurantmanager.delivery.services;

import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.delivery.dtos.ConfigDelivery;
import br.com.restaurantmanager.delivery.dtos.OrcamentoEntrega;
import br.com.restaurantmanager.delivery.dtos.RegiaoDelivery;
import br.com.restaurantmanager.delivery.repositories.DeliveryRepository;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.unidades.services.FuncionamentoUnidadeService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class DeliveryService {
    private final DeliveryRepository repository;
    private final AcessosService acessos;
    private final FuncionamentoUnidadeService funcionamento;

    public DeliveryService(
            DeliveryRepository repository,
            AcessosService acessos,
            FuncionamentoUnidadeService funcionamento) {
        this.repository = repository;
        this.acessos = acessos;
        this.funcionamento = funcionamento;
    }

    @Transactional
    public ConfigDelivery consultar(IdentidadeAtual ator, UUID unidade) {
        acessos.autorizarAdministrador(ator, false);
        funcionamento.consultar(ator, unidade);
        return repository.consultar(unidade);
    }

    @Transactional
    public ConfigDelivery salvar(IdentidadeAtual ator, UUID unidade, ConfigDelivery entrada) {
        acessos.autorizarAdministrador(ator, true);
        funcionamento.consultar(ator, unidade);
        var anterior = repository.consultar(unidade);
        if (anterior.versao() != entrada.versao())
            throw ErrosPedido.conflito("As regiões foram alteradas. Recarregue antes de salvar.");
        if (entrada.checkoutSegundos() < 60 || entrada.checkoutSegundos() > 86400)
            throw ErrosPedido.regra("O prazo de pagamento deve estar entre um minuto e 24 horas.");
        var ids = new HashSet<UUID>();
        var regioes =
                entrada.regioes().stream()
                        .sorted(Comparator.comparing(RegiaoDelivery::cepInicial))
                        .toList();
        String fimAnterior = null;
        for (var regiao : regioes) {
            if (!ids.add(regiao.id()) || regiao.cepInicial().compareTo(regiao.cepFinal()) > 0)
                throw ErrosPedido.regra(
                        "Confira as faixas de CEP e os identificadores das regiões.");
            Dinheiro.ler(regiao.taxa());
            Dinheiro.ler(regiao.minimo());
            if (regiao.nome().chars().anyMatch(Character::isISOControl))
                throw ErrosPedido.regra("Nome da região contém caracteres inválidos.");
            if (!regiao.ativa()) continue;
            if (fimAnterior != null && regiao.cepInicial().compareTo(fimAnterior) <= 0)
                throw ErrosPedido.regra("As faixas ativas de CEP não podem se sobrepor.");
            fimAnterior = regiao.cepFinal();
        }
        var nova = new ConfigDelivery(anterior.versao() + 1, entrada.checkoutSegundos(), regioes);
        repository.salvar(unidade, nova);
        acessos.auditarConfiguracao(
                ator, unidade, "REGIOES_DELIVERY_ALTERADAS", anterior.toString(), nova.toString());
        return nova;
    }

    @Transactional
    public OrcamentoEntrega orcar(UUID unidade, String cep, BigDecimal subtotal) {
        acessos.bloquearPoliticaOperacional();
        funcionamento.consultarPublico(unidade);
        var config = repository.consultar(unidade);
        var regiao =
                config.regioes().stream()
                        .filter(
                                r ->
                                        r.ativa()
                                                && cep.compareTo(r.cepInicial()) >= 0
                                                && cep.compareTo(r.cepFinal()) <= 0)
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        ErrosPedido.regra(
                                                "Endereço fora da área de entrega desta unidade."));
        if (subtotal.compareTo(Dinheiro.ler(regiao.minimo())) < 0)
            throw ErrosPedido.regra("O subtotal dos itens está abaixo do mínimo da região.");
        String taxa = Dinheiro.texto(Dinheiro.ler(regiao.taxa()));
        String revisao =
                hash(
                        unidade
                                + ":"
                                + config.versao()
                                + ":"
                                + cep
                                + ":"
                                + Dinheiro.texto(subtotal)
                                + ":"
                                + taxa);
        return new OrcamentoEntrega(
                regiao.id(),
                regiao.nome(),
                taxa,
                Dinheiro.texto(Dinheiro.ler(regiao.minimo())),
                Dinheiro.texto(subtotal.add(Dinheiro.ler(taxa))),
                revisao);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ConfigDelivery paraPedido(UUID unidade) {
        return repository.consultar(unidade);
    }

    private String hash(String texto) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(texto.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException("SHA-256 indisponível.", erro);
        }
    }
}
