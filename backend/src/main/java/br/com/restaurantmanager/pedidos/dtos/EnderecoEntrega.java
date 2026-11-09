package br.com.restaurantmanager.pedidos.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record EnderecoEntrega(
        @NotBlank @Size(max = 150) @Pattern(regexp = "[^\\p{Cntrl}]*") String logradouro,
        @NotBlank @Size(max = 20) @Pattern(regexp = "[^\\p{Cntrl}]*") String numero,
        @Size(max = 100) @Pattern(regexp = "[^\\p{Cntrl}]*") String complemento,
        @NotBlank @Size(max = 100) @Pattern(regexp = "[^\\p{Cntrl}]*") String bairro,
        @NotBlank @Size(max = 100) @Pattern(regexp = "[^\\p{Cntrl}]*") String cidade,
        @NotBlank @Pattern(regexp = "[A-Z]{2}") String uf,
        @NotBlank @Pattern(regexp = "[0-9]{8}") String cep,
        @Size(max = 100) @Pattern(regexp = "[^\\p{Cntrl}]*") String destinatario,
        @Size(max = 40) @Pattern(regexp = "[^\\p{Cntrl}]*") String contato) {
    public EnderecoEntrega(
            String logradouro,
            String numero,
            String complemento,
            String bairro,
            String cidade,
            String uf,
            String cep) {
        this(logradouro, numero, complemento, bairro, cidade, uf, cep, null, null);
    }
}
