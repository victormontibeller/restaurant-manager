export const estilosFormularioAcesso = `
  form {
    display: grid;
    gap: 0.5rem;
    max-width: 28rem;
    margin-bottom: 1.5rem;
  }

  input {
    width: 100%;
    min-height: 48px;
    border: 1px solid #6b7a70;
    border-radius: 0.4rem;
    padding: 0.6rem;
    font: inherit;
  }

  label {
    font-weight: 650;
  }

  .erro {
    color: var(--gestao-erro-fg, #9d2424);
    font-weight: 600;
  }

  :host(.formulario-cliente) form {
    max-width: none;
    margin: 12px 0 16px;
  }

  :host(.formulario-cliente) h1 {
    margin: 0 0 8px;
    font: 400 clamp(1.9rem, 4vw, 2.5rem) / 1.12 var(--fonte-editorial);
    letter-spacing: -0.035em;
  }

  :host(.formulario-cliente) .etapa-acesso {
    margin: 16px 0 0;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    font: 600 1.25rem / 1.2 var(--fonte-editorial);
  }

  :host(.formulario-cliente) p {
    margin: 8px 0 0;
    color: var(--muted-foreground);
    font-size: 0.875rem;
  }

  :host(.formulario-cliente) :is(input, button) {
    min-height: 48px;
    border-radius: 8px;
  }

  :host(.formulario-cliente) input {
    padding: 8px 12px;
    border-color: var(--input);
    background: var(--card);
  }

  :host(.formulario-cliente) input[aria-invalid='true'] {
    border-color: var(--destructive);
  }

  :host(.formulario-cliente) form button {
    margin-top: 4px;
  }

  :host(.formulario-cliente) .voltar-acesso {
    margin-top: 8px;
    padding-inline: 8px;
    background: transparent;
    color: var(--primary);
  }

  :host(.formulario-cliente) :is(.erro, .resultado-acesso) {
    padding: 12px;
    border-radius: 8px;
  }

  :host(.formulario-cliente) .erro {
    background: var(--gestao-erro-bg, #fff1ed);
    color: var(--destructive);
  }

  :host(.formulario-cliente) .resultado-acesso {
    background: var(--muted);
  }
`;
