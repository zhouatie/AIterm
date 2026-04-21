import { createContext, useContext } from 'react';

const noop = () => {};

export const TerminalUiContext = createContext<() => void>(noop);

export function useTerminalUi(): () => void {
  return useContext(TerminalUiContext);
}
