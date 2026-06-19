const BRACKETED_PASTE_START = '\x1b[200~';
const BRACKETED_PASTE_END = '\x1b[201~';

export function wrapBracketedPaste(value: string): string {
  return BRACKETED_PASTE_START + value + BRACKETED_PASTE_END;
}
