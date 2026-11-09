package br.com.restaurantmanager.shared.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class FrontendConfiguration implements WebMvcConfigurer {
    private static final String UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
    private static final String[] ROTAS = {
        "/cardapio", "/carrinho", "/entrar", "/cadastro", "/recuperar-senha", "/verificar-email",
        "/aceitar-convite", "/conta", "/pedidos", "/pedidos/{id:" + UUID + "}", "/mesa", "/mesa/{id:" + UUID + "}",
        "/sem-acesso", "/gestao", "/gestao/entrar", "/gestao/pedidos", "/gestao/pedidos/novo", "/gestao/mesas", "/gestao/catalogo",
        "/gestao/equipe", "/gestao/equipe/convites", "/gestao/convites", "/gestao/acessos", "/gestao/unidades",
        "/gestao/configuracoes/prazos", "/gestao/atualizacoes",
        "/cozinha", "/plataforma", "/design-system"
    };

    public static String[] rotas() {
        return ROTAS.clone();
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        for (String rota : ROTAS) {
            registry.addViewController(rota).setViewName("forward:/index.html");
        }
    }
}
