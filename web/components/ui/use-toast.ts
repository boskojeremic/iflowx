"use client"

import * as React from "react"

type ToastProps = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive"
}

type ToastState = {
  toasts: ToastProps[]
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 3500

type Action =
  | { type: "ADD_TOAST"; toast: ToastProps }
  | { type: "UPDATE_TOAST"; toast: Partial<ToastProps> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string }

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function addToRemoveQueue(toastId: string, dispatch: React.Dispatch<Action>) {
  if (toastTimeouts.has(toastId)) return

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: "REMOVE_TOAST", toastId })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

function reducer(state: ToastState, action: Action): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      }
    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) addToRemoveQueue(toastId, dispatchRef!)
      else state.toasts.forEach((t) => addToRemoveQueue(t.id, dispatchRef!))
      return state
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) return { ...state, toasts: [] }
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) }
    default:
      return state
  }
}

let dispatchRef: React.Dispatch<Action> | null = null

export function useToast() {
  const [state, dispatch] = React.useReducer(reducer, { toasts: [] })
  dispatchRef = dispatch

  const toast = React.useCallback((props: Omit<ToastProps, "id">) => {
    const id = genId()

    dispatch({
      type: "ADD_TOAST",
      toast: {
        id,
        variant: props.variant ?? "default",
        ...props,
      },
    })

    return {
      id,
      dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
      update: (p: Partial<Omit<ToastProps, "id">>) =>
        dispatch({ type: "UPDATE_TOAST", toast: { id, ...p } }),
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

// helper for non-hook usage if needed
export function toast(props: Omit<ToastProps, "id">) {
  if (!dispatchRef) return
  const id = genId()

  dispatchRef({
    type: "ADD_TOAST",
    toast: { id, variant: props.variant ?? "default", ...props },
  })

  return {
    id,
    dismiss: () => dispatchRef?.({ type: "DISMISS_TOAST", toastId: id }),
    update: (p: Partial<Omit<ToastProps, "id">>) =>
      dispatchRef?.({ type: "UPDATE_TOAST", toast: { id, ...p } }),
  }
}