import { useEffect, useRef } from "react";
let locks = 0;
let previousOverflow = "";
export function useDialog(open: boolean, onClose: () => void, busy = false) {
  const close = useRef(onClose);
  close.current = onClose;
  const pending = useRef(busy);
  pending.current = busy;
  useEffect(() => {
    if (!open) return;
    const dialog = [
      ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
    ].at(-1);
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    if (locks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const focusable = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length > 0);
    dialog.tabIndex = -1;
    (focusable()[0] || dialog).focus();
    const key = (event: KeyboardEvent) => {
      if ([...document.querySelectorAll('[role="dialog"]')].at(-1) !== dialog)
        return;
      if (event.key === "Escape" && !pending.current) {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0],
        last = controls.at(-1);
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      if (--locks === 0) document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);
}
