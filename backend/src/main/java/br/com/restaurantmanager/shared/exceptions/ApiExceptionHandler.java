package br.com.restaurantmanager.shared.exceptions;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.shared.dtos.ApiError;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.util.DisconnectedClientHelper;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> uploadExcessivo() {
        return ResponseEntity.status(413).contentType(MediaType.APPLICATION_JSON)
                .body(ApiError.of("ARQUIVO_EXCESSIVO", "Envie uma imagem de até 5 MiB."));
    }

    @ExceptionHandler({MultipartException.class, MissingServletRequestPartException.class})
    ResponseEntity<ApiError> uploadInvalido(Exception error) {
        return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_JSON)
                .body(ApiError.of("ARQUIVO_INVALIDO", "Envie uma imagem no campo arquivo."));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> tipoDeConteudoInvalido() {
        return ResponseEntity.status(415).contentType(MediaType.APPLICATION_JSON).body(ApiError.of("TIPO_DE_CONTEUDO_INVALIDO",
                "Envie o conteúdo no formato indicado para esta operação."));
    }

    @ExceptionHandler(AuthFailure.class)
    ResponseEntity<ApiError> authentication(AuthFailure error) {
        return ResponseEntity.status(error.status()).contentType(MediaType.APPLICATION_JSON)
                .body(ApiError.of(error.code(), error.getMessage()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class,
            MissingServletRequestParameterException.class,
            HandlerMethodValidationException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class})
    ResponseEntity<ApiError> invalidInput(Exception error) {
        return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_JSON)
                .body(ApiError.of("ENTRADA_INVALIDA", "Confira os campos informados."));
    }

    @ExceptionHandler(AsyncRequestNotUsableException.class)
    void conexaoEncerrada() {
        // O transporte já encerrou; escrever outro corpo também falharia.
    }

    @ExceptionHandler(Exception.class)
    @Nullable ResponseEntity<ApiError> unexpected(Exception error) {
        // Jackson e SseEmitter também encapsulam falhas de uma conexão já encerrada.
        if (DisconnectedClientHelper.isClientDisconnectedException(error)) {
            return null;
        }
        var body = ApiError.of("FALHA_INTERNA", "Não foi possível concluir a operação.");
        LOG.error("Falha interna correlacao={} tipo={}", body.correlacao(), error.getClass().getSimpleName());
        return ResponseEntity.internalServerError().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
