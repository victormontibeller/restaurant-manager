package br.com.restaurantmanager.pagamentos.services;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.pagamentos.repositories.InboxPagamentoRepository;
import br.com.restaurantmanager.tenancy.context.TenantScope;

import com.mercadopago.exceptions.MPInvalidWebhookSignatureException;
import com.mercadopago.webhook.WebhookSignatureValidator;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;

import javax.sql.DataSource;

@Service
public class InboxPagamentoService {
    private final InboxPagamentoRepository repository;
    private final String secret;
    private final TransactionTemplate tx;

    public InboxPagamentoService(
            InboxPagamentoRepository repository,
            DataSource source,
            @Value("${rm.pagamentos.webhook-secret:}") String secret) {
        this.repository = repository;
        this.secret = secret;
        this.tx = new TransactionTemplate(new JdbcTransactionManager(source));
        this.tx.setTimeout(15);
    }

    public void receber(String recurso, String requestId, String assinatura) {
        exigirContextoNeutro();
        if (secret.isBlank()
                || recurso == null
                || !recurso.matches("[A-Za-z0-9_-]{1,100}")
                || requestId == null
                || requestId.length() > 100
                || assinatura == null
                || assinatura.length() > 500) throw invalido();
        try {
            WebhookSignatureValidator.validate(
                    assinatura, requestId, recurso.toLowerCase(Locale.ROOT), secret);
        } catch (MPInvalidWebhookSignatureException erro) {
            throw invalido();
        }
        UUID id =
                UUID.nameUUIDFromBytes(
                        (recurso + ":" + requestId + ":" + assinatura)
                                .getBytes(StandardCharsets.UTF_8));
        tx.executeWithoutResult(s -> repository.registrar(id, recurso));
    }

    public void encaminhar() {
        exigirContextoNeutro();
        tx.executeWithoutResult(s -> repository.encaminhar());
    }

    private void exigirContextoNeutro() {
        if (!TenantScope.current().equals("__none__"))
            throw new IllegalStateException("Inbox requer contexto neutro.");
    }

    private AuthFailure invalido() {
        return new AuthFailure(403, "WEBHOOK_INVALIDO", "Notificação inválida.");
    }
}
