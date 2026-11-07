package br.com.restaurantmanager.unidades.repositories;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.unidades.dtos.ConsultaFuncionamentoUnidade;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import br.com.restaurantmanager.unidades.models.FuncionamentoUnidade;
import br.com.restaurantmanager.unidades.models.HorarioFuncionamento;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class FuncionamentoUnidadeRepository {
    private final EntityManager em;

    public FuncionamentoUnidadeRepository(EntityManager em) {
        this.em = em;
    }

    public Optional<String> revisaoPublica(UUID unidade) {
        List<Object[]> linhas = em.createNativeQuery("""
                select u.versao, coalesce(f.versao, 0)
                  from unidade u left join funcionamento_unidade f on f.unidade_id = u.id
                 where u.id = :unidade and u.ativa
                """, Object[].class)
                .setParameter("unidade", unidade)
                .getResultList();
        return linhas.stream().findFirst().map(linha -> linha[0] + ":" + linha[1]);
    }

    public Optional<ConsultaFuncionamentoUnidade> consultar(UUID unidade) {
        // Um único comando mantém unidade, canais e janelas no mesmo snapshot PostgreSQL.
        List<Object[]> linhas = em.createNativeQuery("""
                select u.id, u.nome, u.fuso, u.ativa,
                       coalesce(f.versao, 0), coalesce(f.delivery, false),
                       coalesce(f.retirada, false), coalesce(f.mesa, false),
                       h.canal, h.dia_semana, h.inicio_minuto, h.fim_minuto, u.versao
                  from unidade u
                  left join funcionamento_unidade f on f.unidade_id = u.id
                  left join horario_unidade h on h.unidade_id = f.unidade_id
                 where u.id = :unidade
                """, Object[].class)
                .setParameter("unidade", unidade)
                .getResultList();
        if (linhas.isEmpty()) {
            return Optional.empty();
        }

        Object[] unidadeAtual = linhas.getFirst();
        var canais = new ArrayList<CanalAtendimento>();
        if ((Boolean) unidadeAtual[5]) {
            canais.add(CanalAtendimento.DELIVERY);
        }
        if ((Boolean) unidadeAtual[6]) {
            canais.add(CanalAtendimento.RETIRADA);
        }
        if ((Boolean) unidadeAtual[7]) {
            canais.add(CanalAtendimento.MESA);
        }

        var horarios = new ArrayList<HorarioFuncionamento>();
        for (Object[] linha : linhas) {
            if (linha[8] != null) {
                horarios.add(new HorarioFuncionamento(CanalAtendimento.valueOf((String) linha[8]),
                        ((Number) linha[9]).intValue(), ((Number) linha[10]).intValue(),
                        ((Number) linha[11]).intValue()));
            }
        }
        var funcionamento = new FuncionamentoUnidade(((Number) unidadeAtual[4]).longValue(), canais, horarios);
        return Optional.of(new ConsultaFuncionamentoUnidade((UUID) unidadeAtual[0], (String) unidadeAtual[1],
                (String) unidadeAtual[2], (Boolean) unidadeAtual[3],
                ((Number) unidadeAtual[12]).longValue(), funcionamento));
    }

    public void salvar(UUID unidade, FuncionamentoUnidade funcionamento, long versaoAnterior) {
        int alterados = em.createNativeQuery("""
                insert into funcionamento_unidade(unidade_id, versao, delivery, retirada, mesa)
                values (:unidade, :versao, :delivery, :retirada, :mesa)
                on conflict (unidade_id) do update
                   set versao = excluded.versao, delivery = excluded.delivery,
                       retirada = excluded.retirada, mesa = excluded.mesa
                 where funcionamento_unidade.versao = :anterior
                """)
                .setParameter("unidade", unidade)
                .setParameter("versao", funcionamento.versao())
                .setParameter("delivery", funcionamento.habilitado(CanalAtendimento.DELIVERY))
                .setParameter("retirada", funcionamento.habilitado(CanalAtendimento.RETIRADA))
                .setParameter("mesa", funcionamento.habilitado(CanalAtendimento.MESA))
                .setParameter("anterior", versaoAnterior)
                .executeUpdate();
        if (alterados != 1) {
            throw new AuthFailure(409, "CONFLITO", "O funcionamento foi alterado. Recarregue antes de salvar.");
        }

        em.createNativeQuery("delete from horario_unidade where unidade_id = :unidade")
                .setParameter("unidade", unidade)
                .executeUpdate();
        for (var horario : funcionamento.horarios()) {
            em.createNativeQuery("""
                    insert into horario_unidade(unidade_id, canal, dia_semana, inicio_minuto, fim_minuto)
                    values (:unidade, :canal, :dia, :inicio, :fim)
                    """)
                    .setParameter("unidade", unidade)
                    .setParameter("canal", horario.canal().name())
                    .setParameter("dia", horario.diaSemana())
                    .setParameter("inicio", horario.inicioMinuto())
                    .setParameter("fim", horario.fimMinuto())
                    .executeUpdate();
        }
    }
}
