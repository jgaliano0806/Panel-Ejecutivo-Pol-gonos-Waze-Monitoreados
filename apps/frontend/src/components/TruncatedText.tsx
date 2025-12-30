import React, { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Copy, Check } from 'lucide-react';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  showCopyButton?: boolean;
  className?: string;
}

/**
 * Componente reutilizable para truncar texto largo con tooltip y botón de copiar
 * Ideal para URLs, IDs largos, o cualquier texto que necesite truncamiento
 */
export const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxLength = 50,
  showCopyButton = false,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const isTruncated = text.length > maxLength;
  const displayText = isTruncated ? `${text.slice(0, maxLength)}...` : text;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root open={tooltipOpen} onOpenChange={setTooltipOpen}>
          <Tooltip.Trigger asChild>
            <span
              className="text-sm font-mono text-gray-700 dark:text-gray-300 cursor-help"
              onMouseEnter={() => isTruncated && setTooltipOpen(true)}
              onMouseLeave={() => setTooltipOpen(false)}
            >
              {displayText}
            </span>
          </Tooltip.Trigger>
          {isTruncated && (
            <Tooltip.Portal>
              <Tooltip.Content
                className="max-w-md px-3 py-2 text-sm bg-gray-900 text-white rounded-md shadow-lg z-50 break-all"
                sideOffset={5}
              >
                {text}
                <Tooltip.Arrow className="fill-gray-900" />
              </Tooltip.Content>
            </Tooltip.Portal>
          )}
        </Tooltip.Root>
      </Tooltip.Provider>

      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Copiar al portapapeles"
          aria-label="Copiar texto completo"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      )}
    </div>
  );
};

export default TruncatedText;
