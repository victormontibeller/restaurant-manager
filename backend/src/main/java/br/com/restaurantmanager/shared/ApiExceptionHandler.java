package br.com.restaurantmanager.shared;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> uploadExcessivo() {
        return ResponseEntity.status(413).body(ApiError.of("ARQUIVO_EXCESSIVO", "Envie uma imagem de até 5 MiB."));
    }

    @ExceptionHandler({org.springframework.web.multipart.MultipartException.class,
            org.springframework.web.multipart.support.MissingServletRequestPartException.class})
    ResponseEntity<ApiError> uploadInvalido(Exception error) {
        return ResponseEntity.badRequest().body(ApiError.of("ARQUIVO_INVALIDO", "Envie uma imagem no campo arquivo."));
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> tipoDeConteudoInvalido() {
        return ResponseEntity.status(415).body(ApiError.of("TIPO_DE_CONTEUDO_INVALIDO",
                "Envie o conteúdo no formato indicado para esta operação."));
    }
    @ExceptionHandler(br.com.restaurantmanager.identidade.AuthFailure.class)
    ResponseEntity<ApiError> authentication(br.com.restaurantmanager.identidade.AuthFailure error) {
        return ResponseEntity.status(error.status()).body(ApiError.of(error.code(), error.getMessage()));
    }
    @ExceptionHandler({org.springframework.web.bind.MethodArgumentNotValidException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.web.method.annotation.HandlerMethodValidationException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
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
