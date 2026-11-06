package br.com.restaurantmanager.midia.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class NormalizadorImagemTest {
    private final NormalizadorImagem normalizador = new NormalizadorImagem();

    @Test
    void usaTipoRealIgnoraNomeEEliminaConteudoAnexado() throws Exception {
        byte[] original = imagem(40, 20, "png");
        byte[] anexo = "<script>segredo-de-metadados</script>".getBytes(StandardCharsets.UTF_8);
        byte[] composta = Arrays.copyOf(original, original.length + anexo.length);
        System.arraycopy(anexo, 0, composta, original.length, anexo.length);

        var resultado = normalizador.normalizar(new MockMultipartFile(
                "arquivo", "../../privado/arquivo.html", "text/html", composta));

        assertThat(resultado.tipo()).isEqualTo("image/png");
        assertThat(resultado.largura()).isEqualTo(40);
        assertThat(resultado.altura()).isEqualTo(20);
        assertThat(new String(resultado.conteudo(), StandardCharsets.ISO_8859_1)).doesNotContain("segredo", "script");
        assertThat(resultado.sha256()).matches("[a-f0-9]{64}");
        assertThat(ImageIO.read(new ByteArrayInputStream(resultado.conteudo()))).isNotNull();
        assertThat(resultado.sha256()).isEqualTo(normalizador.normalizar(arquivo(original)).sha256());
    }

    @Test
    void otimizaSemAmpliarEMantemProporcao() throws Exception {
        var resultado = normalizador.normalizar(arquivo(imagem(2560, 1280, "png")));
        assertThat(resultado.largura()).isEqualTo(1280);
        assertThat(resultado.altura()).isEqualTo(640);
        assertThat(ImageIO.read(new ByteArrayInputStream(resultado.conteudo())).getWidth()).isEqualTo(1280);
    }

    @Test
    void reencodaJpeg() throws Exception {
        var resultado = normalizador.normalizar(arquivo(imagem(80, 60, "jpeg")));
        assertThat(resultado.tipo()).isEqualTo("image/jpeg");
        assertThat(ImageIO.read(new ByteArrayInputStream(resultado.conteudo())).getHeight()).isEqualTo(60);
    }

    @Test
    void rejeitaImagemVaziaTipoFalsoSvgGifECorrupcao() throws Exception {
        for (byte[] bytes : new byte[][] {
                new byte[0], "<svg><script>alert(1)</script></svg>".getBytes(StandardCharsets.UTF_8),
                imagem(2, 2, "gif"), Arrays.copyOf(imagem(10, 10, "png"), 18),
                new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff, 0, (byte) 0xff, (byte) 0xd9}}) {
            assertThatThrownBy(() -> normalizador.normalizar(arquivo(bytes)))
                    .isInstanceOfSatisfying(AuthFailure.class, erro -> assertThat(erro.status()).isEqualTo(422));
        }
    }

    @Test
    void rejeitaMaisDeCincoMiB() {
        assertThatThrownBy(() -> normalizador.normalizar(arquivo(new byte[5 * 1024 * 1024 + 1])))
                .isInstanceOfSatisfying(AuthFailure.class, erro -> assertThat(erro.status()).isEqualTo(413));
    }

    @Test
    void rejeitaDimensaoEPixelsAntesDeDecodificarBitmap() throws Exception {
        for (int[] dimensoes : new int[][] {{4097, 1}, {4000, 3001}, {1, 4097}}) {
            byte[] png = imagem(1, 1, "png");
            ByteBuffer.wrap(png).putInt(16, dimensoes[0]).putInt(20, dimensoes[1]);
            assertThatThrownBy(() -> normalizador.normalizar(arquivo(png)))
                    .isInstanceOfSatisfying(AuthFailure.class, erro -> {
                        assertThat(erro.status()).isEqualTo(422);
                        assertThat(erro.getMessage()).contains("4096");
                    });
        }
    }

    private MockMultipartFile arquivo(byte[] bytes) {
        return new MockMultipartFile("arquivo", "imagem.png", "image/png", bytes);
    }

    private byte[] imagem(int largura, int altura, String formato) throws Exception {
        var imagem = new BufferedImage(largura, altura, BufferedImage.TYPE_INT_RGB);
        try (var saida = new ByteArrayOutputStream()) {
            assertThat(ImageIO.write(imagem, formato, saida)).isTrue();
            return saida.toByteArray();
        }
    }
}
