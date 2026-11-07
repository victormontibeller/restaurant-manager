package br.com.restaurantmanager.midia.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.zip.CRC32;
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
    void preservaAsOitoOrientacoesJpegIncluindoEspelhosSemPublicarExif() throws Exception {
        conferirOrientacoes("jpeg");
    }

    @Test
    void preservaAsOitoOrientacoesPngSemPublicarChunkExif() throws Exception {
        conferirOrientacoes("png");
    }

    @Test
    void aplicaOrientacaoJuntoDaReducaoPreservandoLimiteEProporcao() throws Exception {
        byte[] original = imagemColorida(2560, 1280, "jpeg");
        var resultado = normalizador.normalizar(arquivo(comExif(original, "jpeg", tiff(6, ByteOrder.BIG_ENDIAN))));

        assertThat(resultado.largura()).isEqualTo(640);
        assertThat(resultado.altura()).isEqualTo(1280);
        conferirCantos(ImageIO.read(new ByteArrayInputStream(resultado.conteudo())), "CADB");
    }

    @Test
    void metadadosInvalidosNaoSeguemOffsetsNemImpedemImagemValida() throws Exception {
        byte[] original = imagemColorida(80, 60, "jpeg");
        byte[] referencia = normalizador.normalizar(arquivo(original)).conteudo();
        var invalidos = List.of(
                alterarTiff(4, -1), alterarTiff(4, 0), alterarTiff(4, 26),
                alterarTiff(14, Integer.MAX_VALUE),
                alterarShortTiff(8, 65535), alterarShortTiff(12, 4),
                tiff(0, ByteOrder.BIG_ENDIAN), tiff(9, ByteOrder.BIG_ENDIAN),
                alterarShortTiff(0, 0), alterarShortTiff(2, 41),
                Arrays.copyOf(tiff(6, ByteOrder.BIG_ENDIAN), 7),
                Arrays.copyOf(tiff(6, ByteOrder.BIG_ENDIAN), 15));

        for (byte[] invalido : invalidos) {
            var resultado = normalizador.normalizar(arquivo(comExif(original, "jpeg", invalido)));
            assertThat(resultado.conteudo()).isEqualTo(referencia);
        }
    }

    @Test
    void parserRecusaComprimentosTruncadosSemLerForaDosSegmentos() throws Exception {
        byte[] jpeg = comExif(imagemColorida(80, 60, "jpeg"), "jpeg", tiff(6, ByteOrder.BIG_ENDIAN));
        byte[] png = comExif(imagemColorida(80, 60, "png"), "png", tiff(6, ByteOrder.BIG_ENDIAN));
        for (int comprimento = 0; comprimento < 36; comprimento++) {
            assertThat(OrientacaoImagem.ler(Arrays.copyOf(jpeg, comprimento), "jpeg")).isEqualTo(1);
        }
        ByteBuffer.wrap(png).putInt(33, -1);
        assertThat(OrientacaoImagem.ler(png, "png")).isEqualTo(1);
        jpeg[4] = (byte) 0xff;
        jpeg[5] = (byte) 0xff;
        assertThat(OrientacaoImagem.ler(jpeg, "jpeg")).isEqualTo(1);
    }

    @Test
    void ignoraExifAnexadoDepoisDoFimDoPng() throws Exception {
        byte[] original = imagemColorida(80, 60, "png");
        byte[] comMetadados = comExif(original, "png", tiff(6, ByteOrder.BIG_ENDIAN));
        var anexo = new ByteArrayOutputStream();
        anexo.write(original);
        anexo.write(comMetadados, 33, 38);

        var resultado = normalizador.normalizar(arquivo(anexo.toByteArray()));

        assertThat(resultado.largura()).isEqualTo(80);
        assertThat(resultado.altura()).isEqualTo(60);
        assertThat(resultado.conteudo()).isEqualTo(normalizador.normalizar(arquivo(original)).conteudo());
    }

    @Test
    void ignoraOrientacaoDeChunkPngComCrcCorrompido() throws Exception {
        byte[] original = imagemColorida(80, 60, "png");
        byte[] comMetadados = comExif(original, "png", tiff(6, ByteOrder.BIG_ENDIAN));
        comMetadados[33 + 8 + 26] ^= 1;

        var resultado = normalizador.normalizar(arquivo(comMetadados));

        assertThat(resultado.largura()).isEqualTo(80);
        assertThat(resultado.altura()).isEqualTo(60);
        assertThat(resultado.conteudo()).isEqualTo(normalizador.normalizar(arquivo(original)).conteudo());
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

    private void conferirOrientacoes(String formato) throws Exception {
        String[] cantos = {"ABCD", "BADC", "DCBA", "CDAB", "ACBD", "CADB", "DBCA", "BDAC"};
        byte[] original = imagemColorida(80, 60, formato);
        for (var ordem : List.of(ByteOrder.BIG_ENDIAN, ByteOrder.LITTLE_ENDIAN)) {
            for (int orientacao = 1; orientacao <= 8; orientacao++) {
                var resultado = normalizador.normalizar(arquivo(comExif(original, formato, tiff(orientacao, ordem))));
                boolean vertical = orientacao >= 5;
                assertThat(resultado.largura()).as("largura da orientação %s", orientacao).isEqualTo(vertical ? 60 : 80);
                assertThat(resultado.altura()).as("altura da orientação %s", orientacao).isEqualTo(vertical ? 80 : 60);
                conferirCantos(ImageIO.read(new ByteArrayInputStream(resultado.conteudo())), cantos[orientacao - 1]);
                assertThat(new String(resultado.conteudo(), StandardCharsets.ISO_8859_1))
                        .doesNotContain("Exif", "eXIf");
                assertThat(normalizador.normalizar(arquivo(comExif(original, formato, tiff(orientacao, ordem)))).sha256())
                        .isEqualTo(resultado.sha256());
            }
        }
    }

    private void conferirCantos(BufferedImage imagem, String esperados) {
        var cores = List.of(Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW);
        int[][] pontos = {{imagem.getWidth() / 4, imagem.getHeight() / 4},
                {3 * imagem.getWidth() / 4, imagem.getHeight() / 4},
                {imagem.getWidth() / 4, 3 * imagem.getHeight() / 4},
                {3 * imagem.getWidth() / 4, 3 * imagem.getHeight() / 4}};
        for (int indice = 0; indice < pontos.length; indice++) {
            var esperada = cores.get(esperados.charAt(indice) - 'A');
            var atual = new Color(imagem.getRGB(pontos[indice][0], pontos[indice][1]));
            int diferenca = Math.abs(atual.getRed() - esperada.getRed())
                    + Math.abs(atual.getGreen() - esperada.getGreen())
                    + Math.abs(atual.getBlue() - esperada.getBlue());
            assertThat(diferenca).as("cor no canto %s; ordem %s", indice, esperados).isLessThan(30);
        }
    }

    private byte[] tiff(int orientacao, ByteOrder ordem) {
        var buffer = ByteBuffer.allocate(26).order(ordem);
        buffer.putShort((short) (ordem == ByteOrder.BIG_ENDIAN ? 0x4d4d : 0x4949));
        buffer.putShort((short) 42).putInt(8).putShort((short) 1);
        buffer.putShort((short) 0x0112).putShort((short) 3).putInt(1);
        buffer.putShort((short) orientacao).putShort((short) 0).putInt(0);
        return buffer.array();
    }

    private byte[] alterarTiff(int posicao, int valor) {
        byte[] bytes = tiff(6, ByteOrder.BIG_ENDIAN);
        ByteBuffer.wrap(bytes).putInt(posicao, valor);
        return bytes;
    }

    private byte[] alterarShortTiff(int posicao, int valor) {
        byte[] bytes = tiff(6, ByteOrder.BIG_ENDIAN);
        ByteBuffer.wrap(bytes).putShort(posicao, (short) valor);
        return bytes;
    }

    private byte[] comExif(byte[] original, String formato, byte[] tiff) throws Exception {
        var saida = new ByteArrayOutputStream();
        if (formato.equals("jpeg")) {
            saida.write(original, 0, 2);
            saida.write(new byte[] {(byte) 0xff, (byte) 0xe1});
            saida.write(ByteBuffer.allocate(2).putShort((short) (tiff.length + 8)).array());
            saida.write(new byte[] {'E', 'x', 'i', 'f', 0, 0});
            saida.write(tiff);
            saida.write(original, 2, original.length - 2);
        } else {
            // Chunk eXIf depois de IHDR; CRC real para a imagem continuar válida.
            saida.write(original, 0, 33);
            saida.write(ByteBuffer.allocate(4).putInt(tiff.length).array());
            byte[] tipo = "eXIf".getBytes(StandardCharsets.US_ASCII);
            saida.write(tipo);
            saida.write(tiff);
            var crc = new CRC32();
            crc.update(tipo);
            crc.update(tiff);
            saida.write(ByteBuffer.allocate(4).putInt((int) crc.getValue()).array());
            saida.write(original, 33, original.length - 33);
        }
        return saida.toByteArray();
    }

    private byte[] imagemColorida(int largura, int altura, String formato) throws Exception {
        var imagem = new BufferedImage(largura, altura, BufferedImage.TYPE_INT_RGB);
        var desenho = imagem.createGraphics();
        try {
            desenho.setColor(Color.RED);
            desenho.fillRect(0, 0, largura / 2, altura / 2);
            desenho.setColor(Color.GREEN);
            desenho.fillRect(largura / 2, 0, largura / 2, altura / 2);
            desenho.setColor(Color.BLUE);
            desenho.fillRect(0, altura / 2, largura / 2, altura / 2);
            desenho.setColor(Color.YELLOW);
            desenho.fillRect(largura / 2, altura / 2, largura / 2, altura / 2);
        } finally {
            desenho.dispose();
        }
        try (var saida = new ByteArrayOutputStream()) {
            assertThat(ImageIO.write(imagem, formato, saida)).isTrue();
            return saida.toByteArray();
        }
    }

    private byte[] imagem(int largura, int altura, String formato) throws Exception {
        var imagem = new BufferedImage(largura, altura, BufferedImage.TYPE_INT_RGB);
        try (var saida = new ByteArrayOutputStream()) {
            assertThat(ImageIO.write(imagem, formato, saida)).isTrue();
            return saida.toByteArray();
        }
    }
}
