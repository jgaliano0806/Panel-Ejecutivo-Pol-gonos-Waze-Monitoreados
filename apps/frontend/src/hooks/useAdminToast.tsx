/**
 * useAdminToast — Sistema de notificaciones tipo snackbar para el AdminPanel
 * Contexto global que permite mostrar toasts desde cualquier componente admin.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// =====================================================
// TIPOS
// =====================================================

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface AdminToast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = no auto-close
}

interface AdminToastContextType {
  showToast: (toast: Omit<AdminToast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// =====================================================
// CONTEXTO
// =====================================================

const AdminToastContext = createContext<AdminToastContextType | null>(null);

// =====================================================
// PROVEEDOR
// =====================================================

export const AdminToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<AdminToast, "id">) => {
      const id = `toast-${Date.now()}-${counterRef.current++}`;
      const duration = toast.duration ?? 4000;
      setToasts((prev) => {
        // Máximo 5 toasts simultáneos
        const next = [...prev, { ...toast, id, duration }];
        return next.slice(-5);
      });
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (title: string, message?: string) =>
      showToast({ variant: "success", title, message }),
    [showToast],
  );

  const error = useCallback(
    (title: string, message?: string) =>
      showToast({ variant: "error", title, message, duration: 6000 }),
    [showToast],
  );

  const warning = useCallback(
    (title: string, message?: string) =>
      showToast({ variant: "warning", title, message, duration: 5000 }),
    [showToast],
  );

  const info = useCallback(
    (title: string, message?: string) =>
      showToast({ variant: "info", title, message }),
    [showToast],
  );

  return (
    <AdminToastContext.Provider
      value={{ showToast, success, error, warning, info }}
    >
      {children}
      <AdminToastContainer toasts={toasts} onClose={removeToast} />
    </AdminToastContext.Provider>
  );
};

// =====================================================
// HOOK
// =====================================================

export function useAdminToast(): AdminToastContextType {
  const ctx = useContext(AdminToastContext);
  if (!ctx) {
    throw new Error("useAdminToast debe usarse dentro de <AdminToastProvider>");
  }
  return ctx;
}

// =====================================================
// COMPONENTE CONTAINER
// =====================================================

const VARIANT_STYLES: Record<
  ToastVariant,
  {
    bg: string;
    border: string;
    icon: React.ElementType;
  }
> = {
  success: {
    bg: "bg-gradient-to-r from-emerald-900/95 to-green-900/95 text-emerald-100",
    border: "border-emerald-500/60",
    icon: CheckCircle2,
  },
  error: {
    bg: "bg-gradient-to-r from-red-900/95 to-rose-900/95 text-red-100",
    border: "border-red-500/60",
    icon: XCircle,
  },
  warning: {
    bg: "bg-gradient-to-r from-amber-800/95 to-yellow-800/95 text-amber-100",
    border: "border-amber-400/60",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-gradient-to-r from-blue-900/95 to-sky-900/95 text-blue-100",
    border: "border-blue-500/60",
    icon: Info,
  },
};

const ICON_COLORS: Record<ToastVariant, string> = {
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
  info: "text-blue-400",
};

interface AdminToastContainerProps {
  toasts: AdminToast[];
  onClose: (id: string) => void;
}

const AdminToastContainer: React.FC<AdminToastContainerProps> = ({
  toasts,
  onClose,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant];
          const Icon = style.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className={`
                pointer-events-auto
                flex items-start gap-3
                min-w-[300px] max-w-[420px]
                px-4 py-3 rounded-xl
                border backdrop-blur-sm shadow-2xl
                ${style.bg} ${style.border}
              `}
            >
              <Icon
                size={20}
                className={`shrink-0 mt-0.5 ${ICON_COLORS[toast.variant]}`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-xs opacity-80 mt-0.5 leading-snug">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => onClose(toast.id)}
                className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
