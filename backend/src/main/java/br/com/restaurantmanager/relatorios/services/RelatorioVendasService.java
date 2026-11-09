package br.com.restaurantmanager.relatorios.services;

import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.relatorios.dtos.RelatorioVendas;
import br.com.restaurantmanager.relatorios.repositories.RelatorioVendasRepository;
import br.com.restaurantmanager.unidades.services.UnidadeService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class RelatorioVendasService {
    private final RelatorioVendasRepository repository;
    private final AcessosService acessos;
    private final UnidadeService unidades;

    public RelatorioVendasService(
            RelatorioVendasRepository repository, AcessosService acessos, UnidadeService unidades) {
        this.repository = repository;
        this.acessos = acessos;
        this.unidades = unidades;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public RelatorioVendas consultar(
            IdentidadeAtual ator, UUID unidade, LocalDate inicio, LocalDate fim) {
        acessos.autorizarOperacaoExistente(ator, Acao.RELATORIO, unidade);
        if (inicio == null
                || fim == null
                || fim.isBefore(inicio)
                || ChronoUnit.DAYS.between(inicio, fim) > 366)
            throw ErrosPedido.regra("Informe um período válido de até 367 dias.");
        String fuso = unidades.fusoOperacional(unidade);
        ZoneId zona = ZoneId.of(fuso);
        Object[] r =
                repository.consultar(
                        unidade,
                        inicio.atStartOfDay(zona).toInstant(),
                        fim.plusDays(1).atStartOfDay(zona).toInstant());
        return new RelatorioVendas(
                unidade,
                inicio,
                fim,
                fuso,
                Instant.now(),
                ((Number) r[0]).longValue(),
                ((Number) r[1]).longValue(),
                texto(r[2]),
                texto(r[3]),
                texto(r[4]),
                texto(r[5]),
                texto(r[6]),
                texto(r[7]),
                texto(r[8]));
    }

    private String texto(Object valor) {
        return Dinheiro.texto((BigDecimal) valor);
    }
}
