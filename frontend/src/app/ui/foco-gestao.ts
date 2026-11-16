export function focarEditor(elemento: HTMLElement, seletor = '[data-gestao-foco]'): void {
  requestAnimationFrame(() => elemento.querySelector<HTMLElement>(seletor)?.focus());
}

export function restaurarFoco(
  origem: HTMLElement | null | undefined,
  alternativa?: HTMLElement,
): void {
  requestAnimationFrame(() => {
    if (origem?.isConnected && !origem.matches(':disabled') && origem.getClientRects().length) {
      origem.focus();
    } else {
      alternativa?.focus();
    }
  });
}
