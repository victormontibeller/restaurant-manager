export const PERFIS_OPERACIONAIS = [
  { codigo: 'GERENTE', nome: 'Gerente' },
  { codigo: 'ATENDIMENTO', nome: 'Atendimento' },
  { codigo: 'CAIXA', nome: 'Caixa' },
  { codigo: 'COZINHA', nome: 'Cozinha' },
  { codigo: 'EXPEDICAO', nome: 'Expedição' },
];

export function nomePerfil(codigo: string): string {
  return codigo === 'ADMINISTRADOR'
    ? 'Administrador'
    : (PERFIS_OPERACIONAIS.find((perfil) => perfil.codigo === codigo)?.nome ?? codigo);
}
