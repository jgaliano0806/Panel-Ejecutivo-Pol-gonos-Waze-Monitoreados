import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

/** Estilos base para `<select>` — coherente con admin dark (Veltrix) */
export const nativeSelectClassName = cn(
  "appearance-none w-full px-3 py-2 pr-9 rounded-lg border text-sm transition-colors",
  "bg-white text-gray-900 border-gray-300",
  "dark:bg-veltrix-bg dark:text-veltrix-text dark:border-veltrix-border",
  "[color-scheme:light] dark:[color-scheme:dark]",
  "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

/** Estilos para `<option>` — evita lista blanca ilegible en dark mode (Windows) */
export const nativeOptionClassName = cn(
  "bg-white text-gray-900",
  "dark:bg-veltrix-card dark:text-veltrix-text",
);

interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

export const NativeSelect: React.FC<NativeSelectProps> = ({
  className,
  wrapperClassName,
  children,
  ...props
}) => (
  <div className={cn("relative", wrapperClassName)}>
    <select className={cn(nativeSelectClassName, className)} {...props}>
      {children}
    </select>
    <ChevronDown
      size={16}
      aria-hidden
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-veltrix-muted"
    />
  </div>
);

interface NativeSelectOptionProps
  extends React.OptionHTMLAttributes<HTMLOptionElement> {}

export const NativeSelectOption: React.FC<NativeSelectOptionProps> = ({
  className,
  ...props
}) => (
  <option className={cn(nativeOptionClassName, className)} {...props} />
);
