'use client';

import { useCallback, useRef } from 'react';

/**
 * Coordinates an "unsaved changes" confirmation between a parent dialog and a
 * child form.
 *
 * Usage (in the parent view):
 * ```tsx
 * const { setDirty, handleOpenChange, closeConfirmed } = useDirtyConfirm(
 *   () => setOpen(false)
 * );
 *
 * <Modal open={open} onOpenChange={handleOpenChange} title="New client">
 *   <NewClientForm
 *     onDirtyChange={setDirty}
 *     onSuccess={() => { closeConfirmed(); refresh(); }}
 *     onCancel={() => handleOpenChange(false)}
 *   />
 * </Modal>
 * ```
 */
export function useDirtyConfirm(
  onClose: () => void,
  message = 'Discard unsaved changes?'
) {
  const dirtyRef = useRef(false);
  const suppressRef = useRef(false);

  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  /** Call from the success path (after submit) to close without prompting. */
  const closeConfirmed = useCallback(() => {
    suppressRef.current = true;
    dirtyRef.current = false;
    onClose();
  }, [onClose]);

  /** Pass to `Modal.onOpenChange` / `SlidePanel.onOpenChange`. */
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) return;
      if (suppressRef.current || !dirtyRef.current) {
        suppressRef.current = false;
        dirtyRef.current = false;
        onClose();
        return;
      }
      if (window.confirm(message)) {
        dirtyRef.current = false;
        onClose();
      }
    },
    [message, onClose]
  );

  return { setDirty, closeConfirmed, handleOpenChange };
}
