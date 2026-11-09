package br.com.restaurantmanager.pagamentos.controllers;

import br.com.restaurantmanager.pagamentos.services.InboxPagamentoService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WebhookPagamentoController {
    private final InboxPagamentoService service;

    public WebhookPagamentoController(InboxPagamentoService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/webhooks/mercadopago")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void receber(
            @RequestParam(name = "data.id", required = false) String recurso,
            @RequestHeader(name = "x-request-id", required = false) String requestId,
            @RequestHeader(name = "x-signature", required = false) String assinatura) {
        service.receber(recurso, requestId, assinatura);
    }
}
