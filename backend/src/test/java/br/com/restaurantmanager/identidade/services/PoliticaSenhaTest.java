package br.com.restaurantmanager.identidade.services;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class PoliticaSenhaTest {
    @Test void rejeitaSenhaAusenteOuCompostaSomenteDeEspacosJava() {
        assertThat(PoliticaSenha.novaSenhaValida(null)).isFalse();
        for (String senha : List.of("", " ".repeat(12), "\t".repeat(12), "\u2003".repeat(12))) {
            assertThat(PoliticaSenha.novaSenhaValida(senha)).isFalse();
        }
    }

    @Test void exigeTamanhoMinimoSemCortarEspacosDasExtremidades() {
        assertThat(PoliticaSenha.novaSenhaValida("a".repeat(11))).isFalse();
        assertThat(PoliticaSenha.novaSenhaValida("a".repeat(12))).isTrue();
        assertThat(PoliticaSenha.novaSenhaValida(" " + "a".repeat(10) + " ")).isTrue();
    }

    @Test void limitaBytesUtf8ParaEvitarTruncamentoNoBcrypt() {
        assertThat(PoliticaSenha.novaSenhaValida("a".repeat(72))).isTrue();
        assertThat(PoliticaSenha.novaSenhaValida("a".repeat(73))).isFalse();
        assertThat(PoliticaSenha.novaSenhaValida("á".repeat(36))).isTrue();
        assertThat(PoliticaSenha.novaSenhaValida("á".repeat(37))).isFalse();
    }
}
