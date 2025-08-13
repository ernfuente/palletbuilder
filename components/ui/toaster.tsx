"use client"

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"

const getToastIcon = (variant?: string) => {
  switch (variant) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
    case "destructive":
      return <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
    case "info":
      return <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
    default:
      return <Info className="h-5 w-5 text-gray-600 flex-shrink-0" />
  }
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <div className="flex items-start space-x-3 flex-1">
            {getToastIcon(variant)}
            <div className="flex-1 space-y-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
