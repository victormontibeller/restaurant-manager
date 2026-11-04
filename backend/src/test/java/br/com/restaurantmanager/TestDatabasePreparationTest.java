package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

/** Testa coordenação da fixture, não substitui testes PostgreSQL de migrations. */
class TestDatabasePreparationTest {
    @Test void validaAlvoEmTodaChamadaMasPreparaUmaVezPorJvm() throws Exception {
        var preparation = new TestDatabase.Preparation();
        var validations = new AtomicInteger();
        var migrations = new AtomicInteger();
        preparation.run(validations::incrementAndGet, migrations::incrementAndGet);
        preparation.run(validations::incrementAndGet, migrations::incrementAndGet);
        assertThat(validations.get()).isEqualTo(2);
        assertThat(migrations.get()).isEqualTo(1);
    }

    @Test void preparacaoFalhaNaoEnvenenaRetomada() throws Exception {
        var preparation = new TestDatabase.Preparation();
        var attempts = new AtomicInteger();
        assertThatThrownBy(() -> preparation.run(() -> {}, () -> {
            attempts.incrementAndGet(); throw new IllegalStateException("Falha injetada");
        })).isInstanceOf(IllegalStateException.class);
        preparation.run(() -> {}, attempts::incrementAndGet);
        preparation.run(() -> {}, attempts::incrementAndGet);
        assertThat(attempts.get()).isEqualTo(2);
    }

    @Test void alvoInvalidoContinuaRecusadoAposPreparacao() throws Exception {
        var preparation = new TestDatabase.Preparation();
        var migrations = new AtomicInteger();
        preparation.run(() -> {}, migrations::incrementAndGet);
        assertThatThrownBy(() -> preparation.run(() -> {throw new IllegalStateException("Alvo recusado");},
                migrations::incrementAndGet)).isInstanceOf(IllegalStateException.class);
        assertThat(migrations.get()).isEqualTo(1);
    }
}
