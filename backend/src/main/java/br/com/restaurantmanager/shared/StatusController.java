package br.com.restaurantmanager.shared;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {
    @GetMapping("/api/v1/status")
    Map<String, String> status() {
        return Map.of("ambiente", "Homologação fictícia", "etapa", "Fundação em desenvolvimento");
    }
}
