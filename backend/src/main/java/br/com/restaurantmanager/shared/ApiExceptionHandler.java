package br.com.restaurantmanager.shared;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception error) {
        var body = ApiError.of("FALHA_INTERNA", "Não foi possível concluir a operação.");
        LOG.error("Falha interna correlacao={} tipo={}", body.correlacao(), error.getClass().getSimpleName());
        return ResponseEntity.internalServerError().body(body);
    }
}
