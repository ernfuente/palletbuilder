// Extracted validation panel for code splitting
import { memo } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ValidationPanelProps {
  compatibility: {
    canFit: boolean
    hasVerticalSpace: boolean
    error?: string
  }
  isCustomPallet: boolean
}

const ValidationPanel = memo(function ValidationPanel({ compatibility, isCustomPallet }: ValidationPanelProps) {
  if (!compatibility.error) return null

  return (
    <Alert variant="warning" className="border-amber-200 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <strong>Compatibility Issue:</strong> {compatibility.error}
      </AlertDescription>
    </Alert>
  )
})

export default ValidationPanel
