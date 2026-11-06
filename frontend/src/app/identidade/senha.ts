// Mesmos espaços de String.isBlank/Character.isWhitespace do Java 21.
// Não usar trim(): ele inclui NBSP e omite os separadores U+001C–U+001F.
// Somente valida; a senha enviada nunca é normalizada ou aparada.
export function senhaEmBranco(senha: string): boolean {
  return /^[\u0009-\u000d\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]*$/u.test(
    senha,
  );
}
