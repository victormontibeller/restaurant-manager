package br.com.restaurantmanager.shared.controllers;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {
    private final String ambiente;

    public StatusController(@Value("${rm.stage}") String stage) {
        this.ambiente = switch (stage) {
            case "dev" -> "Desenvolvimento local";
            case "test" -> "Testes automatizados";
            case "hml" -> "Homologação fictícia";
            default -> "Ambiente restrito";
        };
    }

    @GetMapping("/api/v1/status")
    Map<String, String> status() {
        return Map.of("ambiente", ambiente, "etapa", "Catálogo e PWA — Sprint 2");
    }
}
