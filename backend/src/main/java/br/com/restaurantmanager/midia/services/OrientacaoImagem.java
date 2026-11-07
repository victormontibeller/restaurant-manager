package br.com.restaurantmanager.midia.services;

import java.awt.geom.AffineTransform;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.zip.CRC32;

/** Lê somente Orientation no IFD0, sem seguir outros diretórios ou offsets de conteúdo. */
final class OrientacaoImagem {
    private OrientacaoImagem() {}

    static int ler(byte[] bytes, String formato) {
        return formato.equals("jpeg") ? lerJpeg(bytes) : lerPng(bytes);
    }

    private static int lerJpeg(byte[] bytes) {
        int posicao = 2;
        while (posicao + 4 <= bytes.length && bytes[posicao] == (byte) 0xff) {
            while (posicao < bytes.length && bytes[posicao] == (byte) 0xff) {
                posicao++;
            }
            if (posicao >= bytes.length) {
                break;
            }
            int marcador = Byte.toUnsignedInt(bytes[posicao++]);
            if (marcador == 0xda || marcador == 0xd9) {
                break;
            }
            if (marcador == 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
                continue;
            }
            if (posicao + 2 > bytes.length) {
                break;
            }
            int tamanho = (Byte.toUnsignedInt(bytes[posicao]) << 8)
                    | Byte.toUnsignedInt(bytes[posicao + 1]);
            if (tamanho < 2 || tamanho > bytes.length - posicao) {
                break;
            }
            int inicio = posicao + 2;
            if (marcador == 0xe1 && tamanho >= 8 && bytes[inicio] == 'E'
                    && bytes[inicio + 1] == 'x' && bytes[inicio + 2] == 'i'
                    && bytes[inicio + 3] == 'f' && bytes[inicio + 4] == 0 && bytes[inicio + 5] == 0) {
                return lerTiff(bytes, inicio + 6, tamanho - 8);
            }
            posicao += tamanho;
        }
        return 1;
    }

    private static int lerPng(byte[] bytes) {
        int posicao = 8;
        while (posicao + 12 <= bytes.length) {
            long tamanho = Integer.toUnsignedLong(ByteBuffer.wrap(bytes, posicao, 4).getInt());
            if (tamanho > bytes.length - posicao - 12) {
                break;
            }
            if (bytes[posicao + 4] == 'I' && bytes[posicao + 5] == 'E'
                    && bytes[posicao + 6] == 'N' && bytes[posicao + 7] == 'D') {
                break;
            }
            if (bytes[posicao + 4] == 'e' && bytes[posicao + 5] == 'X'
                    && bytes[posicao + 6] == 'I' && bytes[posicao + 7] == 'f') {
                var crc = new CRC32();
                crc.update(bytes, posicao + 4, (int) tamanho + 4);
                int declarado = ByteBuffer.wrap(bytes, posicao + 8 + (int) tamanho, 4).getInt();
                if ((int) crc.getValue() != declarado) {
                    return 1;
                }
                return lerTiff(bytes, posicao + 8, (int) tamanho);
            }
            posicao += (int) tamanho + 12;
        }
        return 1;
    }

    private static int lerTiff(byte[] bytes, int inicio, int tamanho) {
        if (tamanho < 8) {
            return 1;
        }
        ByteOrder ordem;
        if (bytes[inicio] == 'I' && bytes[inicio + 1] == 'I') {
            ordem = ByteOrder.LITTLE_ENDIAN;
        } else if (bytes[inicio] == 'M' && bytes[inicio + 1] == 'M') {
            ordem = ByteOrder.BIG_ENDIAN;
        } else {
            return 1;
        }
        var tiff = ByteBuffer.wrap(bytes, inicio, tamanho).slice().order(ordem);
        if (Short.toUnsignedInt(tiff.getShort(2)) != 42) {
            return 1;
        }
        long diretorio = Integer.toUnsignedLong(tiff.getInt(4));
        if (diretorio < 8 || diretorio > tamanho - 2) {
            return 1;
        }
        int entrada = (int) diretorio + 2;
        int quantidade = Short.toUnsignedInt(tiff.getShort((int) diretorio));
        if (quantidade > (tamanho - entrada) / 12) {
            return 1;
        }
        for (int indice = 0; indice < quantidade; indice++, entrada += 12) {
            if (Short.toUnsignedInt(tiff.getShort(entrada)) == 0x0112
                    && Short.toUnsignedInt(tiff.getShort(entrada + 2)) == 3
                    && tiff.getInt(entrada + 4) == 1) {
                int orientacao = Short.toUnsignedInt(tiff.getShort(entrada + 8));
                return orientacao >= 1 && orientacao <= 8 ? orientacao : 1;
            }
        }
        return 1;
    }

    static boolean trocaEixos(int orientacao) {
        return orientacao >= 5 && orientacao <= 8;
    }

    /** Transforma as bordas do bitmap já dimensionado; o desenho aplica a escala em seguida. */
    static AffineTransform transformacao(int orientacao, int largura, int altura) {
        return switch (orientacao) {
            case 2 -> new AffineTransform(-1, 0, 0, 1, largura, 0);
            case 3 -> new AffineTransform(-1, 0, 0, -1, largura, altura);
            case 4 -> new AffineTransform(1, 0, 0, -1, 0, altura);
            case 5 -> new AffineTransform(0, 1, 1, 0, 0, 0);
            case 6 -> new AffineTransform(0, 1, -1, 0, altura, 0);
            case 7 -> new AffineTransform(0, -1, -1, 0, altura, largura);
            case 8 -> new AffineTransform(0, -1, 1, 0, 0, largura);
            default -> new AffineTransform();
        };
    }
}
