"use client"

// Extracted advanced options for code splitting
import type React from "react"
import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, ChevronDown, ChevronUp } from "lucide-react"

interface AdvancedOptionsProps {
  expanded: boolean
  onToggle: () => void
  children?: React.ReactNode
}

const AdvancedOptions = memo(function AdvancedOptions({ expanded, onToggle, children }: AdvancedOptionsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="text-gray-600 w-5 h-5" />
            <div>
              <CardTitle className="text-lg">Advanced Options</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Additional configuration settings</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle} className="h-8 w-8 p-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )
})

export default AdvancedOptions
