package br.com.restaurantmanager.tenancy.controllers;

import br.com.restaurantmanager.tenancy.dtos.RestaurantePublico;
import br.com.restaurantmanager.tenancy.services.TenantService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RestauranteController {
    private final TenantService service;

    public RestauranteController(TenantService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/restaurante")
    public RestaurantePublico consultar() {
        return service.restaurantePublico();
    }
}
