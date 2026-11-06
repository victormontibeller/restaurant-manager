package br.com.restaurantmanager.midia;

import br.com.restaurantmanager.identidade.IdentidadeAtual;
import br.com.restaurantmanager.identidade.AuthFailure;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

@RestController
public class MidiaController {
    private final MidiaService service;

    public MidiaController(MidiaService service) {
        this.service = service;
    }

    @PostMapping(value = "/api/v1/gestao/midias/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MidiaResumo> enviar(@AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable UUID id, @RequestParam("arquivo") MultipartFile arquivo,
            MultipartHttpServletRequest requisicao) {
        if (requisicao.getMultiFileMap().size() != 1 || requisicao.getFiles("arquivo").size() != 1
                || !requisicao.getParameterMap().isEmpty()) {
            throw new AuthFailure(400, "ARQUIVO_INVALIDO", "Envie somente uma imagem no campo arquivo, sem outros campos.");
        }
        var resultado = service.enviar(ator, id, arquivo);
        return ResponseEntity.status(resultado.criada() ? 201 : 200)
                .location(URI.create("/api/v1/gestao/midias/" + id)).cacheControl(CacheControl.noStore())
                .body(resultado.midia());
    }

    @GetMapping("/api/v1/gestao/midias/{id}")
    public MidiaResumo consultar(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.consultar(ator, id);
    }

    @GetMapping("/api/v1/midias/{id}")
    public ResponseEntity<byte[]> consultarPublico(@PathVariable UUID id) {
        var conteudo = service.conteudoPublico(id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(conteudo.midia().contentType()))
                .contentLength(conteudo.bytes().length).body(conteudo.bytes());
    }
}
