---
description: radix-ui-component Componente con Radix UI + Tailwind
---

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export function AlertDialog({ alert, open, onClose }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-semibold mb-2">
            {alert.type}
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-600 mb-4">
            {alert.street} - Confidence: {alert.confidence}/10
          </Dialog.Description>

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Close
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
Componentes útiles:

Dialog, Select, Tooltip, Tabs, Toast
Dropdown Menu, Popover, Alert Dialog
Unstyled por defecto → combinar con Tailwind
