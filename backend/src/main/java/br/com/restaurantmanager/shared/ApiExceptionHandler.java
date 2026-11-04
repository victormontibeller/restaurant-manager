package br.com.restaurantmanager.shared;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(br.com.restaurantmanager.identidade.AuthFailure.class)
    ResponseEntity<ApiError> authentication(br.com.restaurantmanager.identidade.AuthFailure error) {
        return ResponseEntity.status(error.status()).body(ApiError.of(error.code(), error.getMessage()));
    }
    @ExceptionHandler({org.springframework.web.bind.MethodArgumentNotValidException.class,
            org.springframework.http.converter.HttpMessageNotReadableException.class})
    ResponseEntity<ApiError> invalidInput(Exception error) {
        return ResponseEntity.badRequest().body(ApiError.of("ENTRADA_INVALIDA", "Confira os campos informados."));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception error) {
        var body = ApiError.of("FALHA_INTERNA", "Não foi possível concluir a operação.");
        LOG.error("Falha interna correlacao={} tipo={}", body.correlacao(), error.getClass().getSimpleName());
        return ResponseEntity.internalServerError().body(body);
    }
}
