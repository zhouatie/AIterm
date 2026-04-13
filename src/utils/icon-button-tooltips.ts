import {
  formatShortcutForDisplay,
  type ShortcutActionId,
  type ShortcutBindings,
} from '../ShortcutContext';

interface IconButtonTooltipOptions {
  label: string;
  bindings?: ShortcutBindings;
  actionId?: ShortcutActionId;
}

export function getIconButtonTooltip({
  label,
  bindings,
  actionId,
}: IconButtonTooltipOptions): string {
  if (!bindings || !actionId) {
    return label;
  }

  const shortcut = bindings[actionId];
  if (!shortcut) {
    return label;
  }

  return `${label}（${formatShortcutForDisplay(shortcut)}）`;
}
