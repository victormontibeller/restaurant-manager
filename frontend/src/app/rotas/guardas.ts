import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { SessaoNavegacaoService } from '../identidade/sessao-navegacao.service';
import { ContextoOperacaoService } from './contexto-operacao.service';
import { NavegacaoProtegidaService } from './navegacao-protegida.service';

export const contaObrigatoria: CanActivateFn = async (_route, state) => {
  const coordenacao = inject(SessaoNavegacaoService);
  const router = inject(Router);
  await coordenacao.inicializar();
  return coordenacao.sessao.identidade() && !coordenacao.encerramentoPendente()
    ? true
    : router.createUrlTree(['/entrar'], { queryParams: { retorno: state.url } });
};

export const clienteObrigatorio: CanActivateFn = async (_route, state) => {
  const coordenacao = inject(SessaoNavegacaoService);
  const contexto = inject(ContextoOperacaoService);
  const router = inject(Router);
  await coordenacao.inicializar();
  if (!coordenacao.sessao.identidade() || coordenacao.encerramentoPendente())
    return router.createUrlTree(['/entrar'], { queryParams: { retorno: state.url } });
  if (coordenacao.sessao.identidade()?.perfil === 'CLIENTE') return true;
  await contexto.carregar();
  return router.parseUrl(contexto.destino());
};

export const equipeObrigatoria: CanActivateFn = async (route, state) => {
  const coordenacao = inject(SessaoNavegacaoService);
  const contexto = inject(ContextoOperacaoService);
  const router = inject(Router);
  await coordenacao.inicializar();
  const pessoa = coordenacao.sessao.identidade();
  if (!pessoa || coordenacao.encerramentoPendente())
    return router.createUrlTree(['/gestao/entrar'], { queryParams: { retorno: state.url } });
  if (pessoa.perfil === 'CLIENTE') return router.parseUrl('/pedidos');
  await contexto.carregar();
  const acao = route.data['acao'] as string | undefined;
  const autorizado =
    (!route.data['administrador'] || contexto.administrador()) &&
    (!route.data['cozinha'] || contexto.podeCozinha()) &&
    (!route.data['expedicao'] || contexto.podeExpedicao()) &&
    (!acao || contexto.tem(acao));
  return autorizado ? true : router.parseUrl('/sem-acesso');
};

export const destinoEquipe: CanActivateFn = async () => {
  const contexto = inject(ContextoOperacaoService);
  const router = inject(Router);
  await contexto.carregar();
  return router.parseUrl(contexto.destino());
};

export const protegerSaida: CanDeactivateFn<unknown> = () =>
  !inject(NavegacaoProtegidaService).impedirSaida();

export function retornoSeguro(valor: string | null): string | null {
  if (!valor || valor.startsWith('//') || valor.includes('\\')) return null;
  return /^\/(cardapio|carrinho|pedidos|conta|mesa|gestao|cozinha)(?:[/?#]|$)/.test(valor)
    ? valor
    : null;
}
