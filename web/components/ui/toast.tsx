"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export type ToastVariant = "default" | "destructive"

export function Toast({
  title,
  description,
  variant = "default",
  onClose,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: ToastVariant
  onClose?: () => void
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto w-[360px] rounded-lg border bg-background/80 backdrop-blur px-4 py-3 shadow-lg",
        "border-white/15 text-white",
        variant === "destructive" && "border-red-500/40"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {title && <div className="text-sm font-semibold">{title}</div>}
          {description && <div className="mt-1 text-xs text-white/70">{description}</div>}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-white/60 hover:text-white hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}