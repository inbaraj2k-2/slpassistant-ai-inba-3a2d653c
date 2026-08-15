/**
 * Temporary diagnostic instrumentation for the global input pipeline.
 * Disabled by default. Enable with VITE_KEYBOARD_DIAGNOSTICS=true.
 * Never focuses, blurs, shows, hides, or mutates inputs.
 */
export function installKeyboardInputDiagnostics(): () => void {
  if (import.meta.env.VITE_KEYBOARD_DIAGNOSTICS !== 'true') return () => {};

  const onFocus = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable)) return;
    console.info('[keyboard-diagnostic] focus', { tag: target.tagName, type: (target as HTMLInputElement).type, valueLength: 'value' in target ? String((target as HTMLInputElement).value).length : null });
  };

  const onBeforeInput = (event: InputEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable)) return;
    console.info('[keyboard-diagnostic] beforeinput', { inputType: event.inputType, dataLength: event.data?.length ?? 0 });
  };

  const onInput = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable)) return;
    console.info('[keyboard-diagnostic] input', { valueLength: 'value' in target ? String((target as HTMLInputElement).value).length : null });
  };

  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('beforeinput', onBeforeInput, true);
  document.addEventListener('input', onInput, true);

  return () => {
    document.removeEventListener('focusin', onFocus, true);
    document.removeEventListener('beforeinput', onBeforeInput, true);
    document.removeEventListener('input', onInput, true);
  };
}
