import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Check, Info, RotateCcw, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const showToast = useCallback((message, options = {}) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = Date.now();
    setToast({
      id,
      message,
      type: options.type || "success",
      onUndo: options.onUndo || null,
    });
    timerRef.current = setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, options.duration || 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {toast && (
        <div className="cv-toast-viewport" role="status" aria-live="polite">
          <div key={toast.id} className="cv-toast-pill">
            <span className={`cv-toast-icon ${toast.type}`}>
              {toast.type === "info" ? <Info size={14} /> : <Check size={14} strokeWidth={2.5} />}
            </span>
            <span className="cv-toast-msg">{toast.message}</span>
            {toast.onUndo && (
              <button
                type="button"
                className="cv-toast-undo"
                onClick={() => {
                  const fn = toast.onUndo;
                  dismissToast();
                  fn();
                }}
              >
                <RotateCcw size={12} />
                <span>Undo</span>
              </button>
            )}
            <button
              type="button"
              className="cv-toast-close"
              onClick={dismissToast}
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { showToast: () => {}, dismissToast: () => {} };
  }
  return ctx;
}
