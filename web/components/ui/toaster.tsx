"use client"

import * as React from "react"
import { toast } from "sonner";

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          title={t.title}
          description={t.description}
          variant={t.variant}
          onClose={() => dismiss(t.id)}
        />
      ))}
    </div>
  )
}