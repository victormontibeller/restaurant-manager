package br.com.restaurantmanager.midia.services;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.midia.dtos.ImagemNormalizada;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class NormalizadorImagem {
    static final int MAXIMO_BYTES = 5 * 1024 * 1024;
    static final int MAXIMA_DIMENSAO = 4096;
    static final long MAXIMO_PIXELS = 12_000_000;
    static final int DIMENSAO_PUBLICADA = 1280;

    ImagemNormalizada normalizar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw invalida("Selecione uma imagem PNG ou JPEG.");
        }
        if (arquivo.getSize() > MAXIMO_BYTES) {
            throw excessiva();
        }
        try (var entrada = arquivo.getInputStream()) {
            // O limite também vale para um provedor de multipart com tamanho declarado incorreto.
            byte[] bytes = entrada.readNBytes(MAXIMO_BYTES + 1);
            if (bytes.length > MAXIMO_BYTES) {
                throw excessiva();
            }
            return decodificar(bytes);
        } catch (IOException | IllegalArgumentException erro) {
            throw invalida("Não foi possível ler a imagem. Envie o arquivo novamente.");
        }
    }

    private ImagemNormalizada decodificar(byte[] bytes) throws IOException {
        String formato = formatoReal(bytes);
        try (var entrada = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var leitores = ImageIO.getImageReadersByFormatName(formato);
            if (!leitores.hasNext()) {
                throw new IllegalStateException("Decodificador de imagem indisponível.");
            }
            ImageReader leitor = leitores.next();
            try {
                leitor.setInput(entrada, true, true);
                int largura = leitor.getWidth(0);
                int altura = leitor.getHeight(0);
                if (largura < 1 || altura < 1 || largura > MAXIMA_DIMENSAO
                        || altura > MAXIMA_DIMENSAO || (long) largura * altura > MAXIMO_PIXELS) {
                    throw invalida("A imagem deve ter até 4096 pixels por lado e 12 milhões de pixels.");
                }
                BufferedImage original = leitor.read(0);
                if (original == null) {
                    throw invalida("A imagem está incompleta ou corrompida.");
                }
                return otimizar(original, formato, OrientacaoImagem.ler(bytes, formato));
            } finally {
                leitor.dispose();
            }
        }
    }

    private String formatoReal(byte[] bytes) {
        if (bytes.length >= 8 && bytes[0] == (byte) 0x89 && bytes[1] == 'P'
                && bytes[2] == 'N' && bytes[3] == 'G' && bytes[4] == 13
                && bytes[5] == 10 && bytes[6] == 26 && bytes[7] == 10) {
            return "png";
        }
        if (bytes.length >= 4 && bytes[0] == (byte) 0xff && bytes[1] == (byte) 0xd8
                && bytes[2] == (byte) 0xff && bytes[bytes.length - 2] == (byte) 0xff
                && bytes[bytes.length - 1] == (byte) 0xd9) {
            return "jpeg";
        }
        throw invalida("Somente imagens PNG ou JPEG válidas são permitidas.");
    }

    private ImagemNormalizada otimizar(BufferedImage original, String formato, int orientacao) throws IOException {
        double escala = Math.min(1.0, (double) DIMENSAO_PUBLICADA
                / Math.max(original.getWidth(), original.getHeight()));
        int largura = Math.max(1, (int) Math.round(original.getWidth() * escala));
        int altura = Math.max(1, (int) Math.round(original.getHeight() * escala));
        int larguraPublicada = OrientacaoImagem.trocaEixos(orientacao) ? altura : largura;
        int alturaPublicada = OrientacaoImagem.trocaEixos(orientacao) ? largura : altura;
        int tipo = formato.equals("png") ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        var publicada = new BufferedImage(larguraPublicada, alturaPublicada, tipo);
        var desenho = publicada.createGraphics();
        try {
            desenho.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            if (orientacao == 1) {
                desenho.drawImage(original, 0, 0, largura, altura, null);
            } else {
                // Orientação e escala no desenho final, sem outro bitmap de até 12 milhões de pixels.
                var transformacao = OrientacaoImagem.transformacao(orientacao, largura, altura);
                transformacao.scale((double) largura / original.getWidth(), (double) altura / original.getHeight());
                desenho.drawImage(original, transformacao, null);
            }
        } finally {
            desenho.dispose();
            original.flush();
        }
        // Uma imagem nova elimina nomes, EXIF, comentários e qualquer conteúdo anexado.
        try (var saida = new ByteArrayOutputStream(); var imagem = new MemoryCacheImageOutputStream(saida)) {
            if (!ImageIO.write(publicada, formato, imagem)) {
                throw new IllegalStateException("Codificador de imagem indisponível.");
            }
            imagem.flush();
            byte[] conteudo = saida.toByteArray();
            if (conteudo.length > MAXIMO_BYTES) {
                throw excessiva();
            }
            return new ImagemNormalizada("image/" + formato, larguraPublicada, alturaPublicada, conteudo, hash(conteudo));
        } finally {
            publicada.flush();
        }
    }

    private String hash(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException("SHA-256 indisponível.", erro);
        }
    }

    private AuthFailure invalida(String mensagem) {
        return new AuthFailure(422, "MIDIA_INVALIDA", mensagem);
    }

    private AuthFailure excessiva() {
        return new AuthFailure(413, "MIDIA_EXCESSIVA", "A imagem deve ter no máximo 5 MiB.");
    }
}
