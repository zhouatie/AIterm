import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ShortcutActionId =
  | 'toggle-file-tree'
  | 'toggle-terminal-sidebar'
  | 'create-workspace';

export type ShortcutBindings = Record<ShortcutActionId, string>;

export interface ShortcutActionDefinition {
  id: ShortcutActionId;
  title: string;
  description: string;
}

interface ShortcutContextValue {
  bindings: ShortcutBindings;
  registerAction: (actionId: ShortcutActionId, handler: () => void | Promise<void>) => () => void;
  saveBindings: (bindings: ShortcutBindings) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

type ShortcutEventLike = Pick<
  KeyboardEvent | React.KeyboardEvent<HTMLElement>,
  'key' | 'metaKey' | 'altKey' | 'shiftKey' | 'ctrlKey'
>;

const STORAGE_KEY_SHORTCUT_BINDINGS = 'app-shortcut-bindings';
export const SETTINGS_PANEL_SHORTCUT = 'Meta+,';
export const SHORTCUT_ACTIONS: ShortcutActionDefinition[] = [
  {
    id: 'toggle-file-tree',
    title: '文件树展示/收起',
    description: '切换左侧文件树模块的显示状态',
  },
  {
    id: 'toggle-terminal-sidebar',
    title: 'Terminal Tab 展示/收起',
    description: '切换 terminal 导航侧边栏的显示状态',
  },
  {
    id: 'create-workspace',
    title: '新增 Workspace',
    description: '创建一个新的 workspace 及其首个终端',
  },
];

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindings = {
  'toggle-file-tree': 'Meta+S',
  'toggle-terminal-sidebar': 'Meta+B',
  'create-workspace': 'Meta+T',
};

const MODIFIER_DISPLAY_LABEL: Record<string, string> = {
  Meta: 'Command',
  Alt: 'Option',
  Shift: 'Shift',
};

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

function isShortcutActionId(value: string): value is ShortcutActionId {
  return SHORTCUT_ACTIONS.some((action) => action.id === value);
}

function normalizePrimaryKey(key: string): string | null {
  if (!key) return null;

  if (key === ' ') return 'Space';
  if (key === 'Esc') return 'Escape';
  if (key.length === 1) return key.toUpperCase();

  if (key === 'Tab' || key === 'Enter' || key === 'Escape') {
    return key;
  }

  return null;
}

function normalizeShortcutParts(parts: string[]): string | null {
  const filteredParts = parts.filter(Boolean);
  const primaryKey = filteredParts.find(
    (part) => part !== 'Meta' && part !== 'Alt' && part !== 'Shift',
  );

  if (!primaryKey || !filteredParts.includes('Meta')) return null;

  const normalizedPrimaryKey = normalizePrimaryKey(primaryKey);
  if (!normalizedPrimaryKey) return null;

  const normalizedParts = ['Meta'];
  if (filteredParts.includes('Shift')) normalizedParts.push('Shift');
  if (filteredParts.includes('Alt')) normalizedParts.push('Alt');
  normalizedParts.push(normalizedPrimaryKey);

  return normalizedParts.join('+');
}

export function normalizeShortcutString(value: string): string | null {
  return normalizeShortcutParts(value.split('+').map((part) => part.trim()));
}

export function eventToShortcut(event: ShortcutEventLike): string | null {
  if (event.ctrlKey || !event.metaKey) return null;

  const normalizedPrimaryKey = normalizePrimaryKey(event.key);
  if (
    !normalizedPrimaryKey
    || normalizedPrimaryKey === 'Meta'
    || normalizedPrimaryKey === 'Shift'
    || normalizedPrimaryKey === 'Alt'
  ) {
    return null;
  }

  const parts = ['Meta'];
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');
  parts.push(normalizedPrimaryKey);

  return parts.join('+');
}

export function formatShortcutForDisplay(shortcut: string): string {
  return shortcut
    .split('+')
    .filter(Boolean)
    .map((part) => MODIFIER_DISPLAY_LABEL[part] || part)
    .join(' + ');
}

export function validateShortcutBindings(bindings: ShortcutBindings): Partial<Record<ShortcutActionId, string>> {
  const errors: Partial<Record<ShortcutActionId, string>> = {};
  const reverseMap = new Map<string, ShortcutActionId>();

  for (const action of SHORTCUT_ACTIONS) {
    const rawValue = bindings[action.id]?.trim() || '';
    if (!rawValue) {
      errors[action.id] = '必须设置快捷键';
      continue;
    }

    const normalizedValue = normalizeShortcutString(rawValue);
    if (!normalizedValue) {
      errors[action.id] = '请使用 Command 组合键';
      continue;
    }

    const duplicatedActionId = reverseMap.get(normalizedValue);
    if (duplicatedActionId) {
      errors[action.id] = '快捷键与其他动作重复';
      errors[duplicatedActionId] = '快捷键与其他动作重复';
      continue;
    }

    reverseMap.set(normalizedValue, action.id);
  }

  return errors;
}

function loadStoredBindings(): ShortcutBindings {
  const fallback = { ...DEFAULT_SHORTCUT_BINDINGS };
  const stored = localStorage.getItem(STORAGE_KEY_SHORTCUT_BINDINGS);

  if (!stored) return fallback;

  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const nextBindings = { ...fallback };

    for (const [actionId, value] of Object.entries(parsed)) {
      if (!isShortcutActionId(actionId) || typeof value !== 'string') continue;
      const normalizedValue = normalizeShortcutString(value);
      if (!normalizedValue) continue;
      nextBindings[actionId] = normalizedValue;
    }

    return nextBindings;
  } catch {
    return fallback;
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

export const ShortcutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const actionHandlersRef = useRef(new Map<ShortcutActionId, () => void | Promise<void>>());
  const [bindings, setBindings] = useState<ShortcutBindings>(loadStoredBindings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const shortcutLookup = useMemo(() => {
    const nextLookup = new Map<string, ShortcutActionId>();
    for (const action of SHORTCUT_ACTIONS) {
      nextLookup.set(bindings[action.id], action.id);
    }
    return nextLookup;
  }, [bindings]);

  const registerAction = useCallback(
    (actionId: ShortcutActionId, handler: () => void | Promise<void>) => {
      actionHandlersRef.current.set(actionId, handler);

      return () => {
        const currentHandler = actionHandlersRef.current.get(actionId);
        if (currentHandler === handler) {
          actionHandlersRef.current.delete(actionId);
        }
      };
    },
    [],
  );

  const saveBindings = useCallback((nextBindings: ShortcutBindings) => {
    const normalizedBindings = { ...DEFAULT_SHORTCUT_BINDINGS };

    for (const action of SHORTCUT_ACTIONS) {
      const normalizedValue = normalizeShortcutString(nextBindings[action.id]);
      if (normalizedValue) {
        normalizedBindings[action.id] = normalizedValue;
      }
    }

    setBindings(normalizedBindings);
    localStorage.setItem(STORAGE_KEY_SHORTCUT_BINDINGS, JSON.stringify(normalizedBindings));
  }, []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isEditableTarget(event.target)) return;

      const shortcut = eventToShortcut(event);
      if (!shortcut) return;

      if (shortcut === SETTINGS_PANEL_SHORTCUT) {
        event.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      const actionId = shortcutLookup.get(shortcut);
      if (!actionId) return;

      const handler = actionHandlersRef.current.get(actionId);
      if (!handler) return;

      event.preventDefault();
      void handler();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutLookup]);

  const value = useMemo<ShortcutContextValue>(
    () => ({
      bindings,
      registerAction,
      saveBindings,
      isSettingsOpen,
      openSettings,
      closeSettings,
    }),
    [bindings, registerAction, saveBindings, isSettingsOpen, openSettings, closeSettings],
  );

  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>;
};

export const useKeyboardShortcuts = (): ShortcutContextValue => {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within ShortcutProvider');
  }
  return context;
};
