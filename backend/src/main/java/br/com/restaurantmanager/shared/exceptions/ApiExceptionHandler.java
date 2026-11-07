package br.com.restaurantmanager.shared.exceptions;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.shared.dtos.ApiError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> uploadExcessivo() {
        return ResponseEntity.status(413).body(ApiError.of("ARQUIVO_EXCESSIVO", "Envie uma imagem de até 5 MiB."));
    }

    @ExceptionHandler({MultipartException.class, MissingServletRequestPartException.class})
    ResponseEntity<ApiError> uploadInvalido(Exception error) {
        return ResponseEntity.badRequest().body(ApiError.of("ARQUIVO_INVALIDO", "Envie uma imagem no campo arquivo."));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> tipoDeConteudoInvalido() {
        return ResponseEntity.status(415).body(ApiError.of("TIPO_DE_CONTEUDO_INVALIDO",
                "Envie o conteúdo no formato indicado para esta operação."));
    }

    @ExceptionHandler(AuthFailure.class)
    ResponseEntity<ApiError> authentication(AuthFailure error) {
        return ResponseEntity.status(error.status()).body(ApiError.of(error.code(), error.getMessage()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class,
            MissingServletRequestParameterException.class,
            HandlerMethodValidationException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class})
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
