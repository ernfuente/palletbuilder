"use client"

import React, { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Package,
  Layers,
  Eye,
  ChevronLeft,
  ChevronRight,
  Home,
  AlertCircle,
  Ruler,
  Truck,
  HelpCircle,
  Sparkles,
  Package2,
  Box,
} from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { storage } from "@/lib/storage"
import {
  validateQuantity,
  validateBoxDimension,
  validateBoxWeight,
  validateMaxHeight,
  validateCustomPalletWidth,
  validateCustomPalletDepth,
  validateCustomPalletHeight,
  validateCustomPalletWeight,
  validateBoxPalletCompatibility,
  type FieldValidationResult,
} from "@/lib/validation"
import {
  calculateMultiPalletLayout,
  type BoxType,
  type PalletConfig,
  type CalculationResult,
} from "@/lib/calculation-worker"

// Dynamic imports for better performance
const ThreeDVisualization = dynamic(() => import("../../../components/ThreeDVisualization"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-50 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading 3D Visualization...</p>
        <p className="text-gray-500 text-sm mt-1">Preparing interactive preview</p>
      </div>
    </div>
  ),
})

const ValidationPanel = dynamic(() => import("@/components/optimized/ValidationPanel"), {
  loading: () => <div className="animate-pulse h-16 bg-gray-100 rounded"></div>,
})

const CalculationResults = dynamic(() => import("@/components/optimized/CalculationResults"), {
  loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded"></div>,
})

/* Preset pallet sizes */
const PALLET_TYPES = {
  "48x40": { width: 48, depth: 40, height: 5.5, name: '48" × 40" Standard' },
  "48x48": { width: 48, depth: 48, height: 5.5, name: '48" × 48" Square' },
  "48x80": { width: 48, depth: 80, height: 5.5, name: '48" × 80" Extended' },
  custom: { width: 48, depth: 40, height: 5.5, name: "Custom Size" },
} as const

const PALLET_BASE_WEIGHTS: Record<keyof typeof PALLET_TYPES, number> = {
  "48x40": 35,
  "48x48": 50,
  "48x80": 70,
  custom: 40,
}

/* Layout Generation Strategies */
const STACKING_PATTERNS = { auto: "Auto-Optimize" } as const

// Preload critical components
if (typeof window !== "undefined") {
  // preloadComponent(() => import("../../../components/ThreeDVisualization"))
}

/* Improved Tooltip Component with Dynamic Width */
interface TooltipProps {
  content: string
  children: React.ReactNode
}

const Tooltip = React.memo(function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<"right" | "left" | "top" | "bottom">("right")
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // Calculate dynamic width based on content length
  const getTooltipWidth = useCallback(() => {
    const length = content.length
    if (length <= 20) return "w-auto min-w-[120px] max-w-[180px]"
    if (length <= 40) return "w-auto min-w-[160px] max-w-[220px]"
    if (length <= 60) return "w-auto min-w-[200px] max-w-[280px]"
    return "w-auto min-w-[240px] max-w-[320px]"
  }, [content])

  const updatePosition = useCallback(() => {
    if (!isVisible || !tooltipRef.current || !triggerRef.current) return

    const tooltip = tooltipRef.current
    const trigger = triggerRef.current
    const triggerRect = trigger.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const spacing = 12 // Gap between trigger and tooltip

    // Calculate available space in each direction
    const spaceRight = viewportWidth - triggerRect.right - spacing
    const spaceLeft = triggerRect.left - spacing
    const spaceTop = triggerRect.top - spacing
    const spaceBottom = viewportHeight - triggerRect.bottom - spacing

    // Determine best position based on available space
    let bestPosition: "right" | "left" | "top" | "bottom" = "right"

    // Get minimum required width based on content
    const minRequiredWidth = Math.min(320, Math.max(120, content.length * 8))

    if (spaceRight >= minRequiredWidth) {
      bestPosition = "right"
    } else if (spaceLeft >= minRequiredWidth) {
      bestPosition = "left"
    } else if (spaceTop >= tooltipRect.height) {
      bestPosition = "top"
    } else if (spaceBottom >= tooltipRect.height) {
      bestPosition = "bottom"
    } else {
      // Choose the side with most space
      const maxSpace = Math.max(spaceRight, spaceLeft, spaceTop, spaceBottom)
      if (maxSpace === spaceLeft) bestPosition = "left"
      else if (maxSpace === spaceTop) bestPosition = "top"
      else if (maxSpace === spaceBottom) bestPosition = "bottom"
      else bestPosition = "right"
    }

    setPosition(bestPosition)
  }, [isVisible, content.length])

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(updatePosition, 10)
      return () => clearTimeout(timer)
    }
  }, [isVisible, updatePosition])

  useEffect(() => {
    if (isVisible) {
      const handleResize = () => updatePosition()
      const handleScroll = () => updatePosition()

      window.addEventListener("resize", handleResize)
      window.addEventListener("scroll", handleScroll, true)

      return () => {
        window.removeEventListener("resize", handleResize)
        window.removeEventListener("scroll", handleScroll, true)
      }
    }
  }, [isVisible, updatePosition])

  const getTooltipClasses = () => {
    const baseClasses =
      "absolute z-[9999] px-3 py-2 text-sm leading-relaxed text-white bg-gray-900 rounded-lg shadow-xl border border-gray-700 font-normal"

    const widthClass = getTooltipWidth()

    switch (position) {
      case "right":
        return `${baseClasses} ${widthClass} top-1/2 left-full ml-3 -translate-y-1/2`
      case "left":
        return `${baseClasses} ${widthClass} top-1/2 right-full mr-3 -translate-y-1/2`
      case "top":
        return `${baseClasses} ${widthClass} bottom-full left-1/2 mb-3 -translate-x-1/2`
      case "bottom":
        return `${baseClasses} ${widthClass} top-full left-1/2 mt-3 -translate-x-1/2`
      default:
        return `${baseClasses} ${widthClass} top-1/2 left-full ml-3 -translate-y-1/2`
    }
  }

  const getArrowClasses = () => {
    switch (position) {
      case "right":
        return "absolute top-1/2 left-0 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-transparent border-r-gray-900 -translate-y-1/2 -translate-x-full"
      case "left":
        return "absolute top-1/2 right-0 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-transparent border-l-gray-900 -translate-y-1/2 translate-x-full"
      case "top":
        return "absolute top-full left-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-gray-900 -translate-x-1/2"
      case "bottom":
        return "absolute bottom-full left-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-transparent border-b-gray-900 -translate-x-1/2"
      default:
        return "absolute top-1/2 left-0 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-transparent border-r-gray-900 -translate-y-1/2 -translate-x-full"
    }
  }

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)} className="cursor-help">
        {children}
      </div>
      {isVisible && (
        <div ref={tooltipRef} className={getTooltipClasses()}>
          {content}
          <div className={getArrowClasses()}></div>
        </div>
      )}
    </div>
  )
})

/* Compact Input Field with Inline Validation */
interface ValidatedInputProps {
  id?: string
  label: string
  description?: string
  value: number | undefined
  onValue: (n: number | undefined) => void
  validation: FieldValidationResult
  min?: number
  max?: number
  step?: number
  integer?: boolean
  placeholder?: string
  required?: boolean
  unit?: string
  tooltip?: string
  className?: string
}

const ValidatedInput = React.memo(function ValidatedInput({
  id,
  label,
  description,
  value,
  onValue,
  validation,
  min,
  max,
  step,
  integer = false,
  placeholder = "0",
  required = false,
  unit,
  tooltip,
  className = "",
}: ValidatedInputProps) {
  const [text, setText] = useState<string>("")

  useEffect(() => {
    const v = value ?? (value === 0 ? 0 : undefined)
    const str = v === undefined ? "" : String(v)
    setText(str)
  }, [value])

  const commit = useCallback(() => {
    const t = text.trim()
    if (t === "") {
      onValue(undefined)
      return
    }

    const parsed = integer ? Number.parseInt(t, 10) : Number.parseFloat(t)
    if (Number.isFinite(parsed)) {
      let n = parsed
      if (typeof min === "number") n = Math.max(min, n)
      if (typeof max === "number") n = Math.min(max, n)
      onValue(n)
    } else {
      const v = value ?? (value === 0 ? 0 : undefined)
      setText(v === undefined ? "" : String(v))
    }
  }, [integer, min, max, onValue, text, value])

  const displayLabel = required ? `${label} *` : label
  const fullLabel = unit ? `${displayLabel} (${unit})` : displayLabel

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-gray-700">
          {fullLabel}
        </Label>
        {tooltip && (
          <Tooltip content={tooltip}>
            <HelpCircle className="text-gray-400 hover:text-gray-700 w-[15px] h-[15px]" />
          </Tooltip>
        )}
      </div>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={text}
        placeholder={placeholder}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit()
          }
          if (e.key === "Escape") {
            const v = value ?? (value === 0 ? 0 : undefined)
            setText(v === undefined ? "" : String(v))
          }
        }}
        className={`h-9 ${!validation.isValid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
        aria-invalid={!validation.isValid}
      />
      {!validation.isValid && (
        <div className="flex items-start gap-1 text-red-600 text-xs">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">{validation.error}</div>
            {validation.suggestion && <div className="text-red-500 mt-0.5">{validation.suggestion}</div>}
          </div>
        </div>
      )}
    </div>
  )
})

/* Compact Section Header */
interface SectionHeaderProps {
  icon: React.ElementType
  title: string
  subtitle: string
  badge?: string
}

const SectionHeader = React.memo(function SectionHeader({ icon: Icon, title, subtitle, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <Icon className="text-gray-600 w-5 h-5" />
        <div>
          <h3 className="text-gray-900 font-bold text-lg">{title}</h3>
          <p className="text-gray-600 text-xs">{subtitle}</p>
        </div>
      </div>
      {badge && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">{badge}</span>}
    </div>
  )
})

/* Main Component */
interface SavedCalculation {
  referenceId: string
  boxes: BoxType[]
  palletConfig: PalletConfig
  calculation: CalculationResult | null
  createdAt: string
  palletWeight?: number
}

export default function PalletCalculatorPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { id } = useParams() as { id?: string | string[] }
  const referenceId = decodeURIComponent(Array.isArray(id) ? (id?.[0] ?? "") : (id ?? ""))

  const [isMounted, setIsMounted] = useState(false)
  const [boxes, setBoxes] = useState<BoxType[]>([])
  const [palletConfig, setPalletConfig] = useState<PalletConfig>({
    type: "48x40",
    width: 48,
    depth: 40,
    height: 5.5,
    maxHeight: 72,
  })
  const [palletWeight, setPalletWeight] = useState<number>(PALLET_BASE_WEIGHTS["48x40"])
  const stackingPattern = "auto" as const
  const [calculation, setCalculation] = useState<CalculationResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [calcMode, setCalcMode] = useState<"idle" | "manual" | "auto">("idle")
  const [currentLayer, setCurrentLayer] = useState(0)
  const [currentPallet, setCurrentPallet] = useState(0)
  const [viewMode, setViewMode] = useState<"full" | "layer">("full")
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const defaultBox: BoxType = {
    id: "box-0",
    sku: "",
    length: undefined,
    width: undefined,
    height: undefined,
    weight: undefined,
    quantity: undefined,
    color: "#9ca3af",
  }

  /* Initialization */
  useEffect(() => {
    setIsMounted(true)
    loadCalculation()
  }, [referenceId])

  /* Single box enforcement */
  useEffect(() => {
    if (boxes.length > 1) setBoxes([boxes[0]])
    if (boxes.length === 0) setBoxes([defaultBox])
  }, [boxes])

  // Reset current layer when switching pallets or view modes
  useEffect(() => {
    setCurrentLayer(0)
  }, [currentPallet, viewMode])

  // Validation Results - moved up before useEffect that uses isFormValid
  const box = boxes[0]
  const isCustomPallet = palletConfig.type === "custom"

  // Individual field validations
  const quantityValidation = useMemo(() => validateQuantity(box?.quantity), [box?.quantity])
  const lengthValidation = useMemo(() => validateBoxDimension(box?.length, "Length"), [box?.length])
  const widthValidation = useMemo(() => validateBoxDimension(box?.width, "Width"), [box?.width])
  const heightValidation = useMemo(() => validateBoxDimension(box?.height, "Height"), [box?.height])
  const weightValidation = useMemo(() => validateBoxWeight(box?.weight), [box?.weight])
  const maxHeightValidation = useMemo(
    () => validateMaxHeight(palletConfig.maxHeight, box?.height),
    [palletConfig.maxHeight, box?.height],
  )

  // Custom pallet validations
  const customWidthValidation = useMemo(() => validateCustomPalletWidth(palletConfig.width), [palletConfig.width])
  const customDepthValidation = useMemo(() => validateCustomPalletDepth(palletConfig.depth), [palletConfig.depth])
  const customHeightValidation = useMemo(() => validateCustomPalletHeight(palletConfig.height), [palletConfig.height])
  const customWeightValidation = useMemo(() => validateCustomPalletWeight(palletWeight), [palletWeight])

  // Compatibility validation
  const compatibility = useMemo(() => {
    if (!box) return { canFit: true, hasVerticalSpace: true }
    return validateBoxPalletCompatibility({ length: box.length, width: box.width, height: box.height }, palletConfig)
  }, [box, palletConfig])

  // Overall validation
  const isFormValid = useMemo(() => {
    if (!box) return false

    const boxValid =
      quantityValidation.isValid &&
      lengthValidation.isValid &&
      widthValidation.isValid &&
      heightValidation.isValid &&
      weightValidation.isValid
    const palletValid = maxHeightValidation.isValid
    const customValid =
      !isCustomPallet ||
      (customWidthValidation.isValid &&
        customDepthValidation.isValid &&
        customHeightValidation.isValid &&
        customWeightValidation.isValid)
    const compatibilityValid = !compatibility.error

    return boxValid && palletValid && customValid && compatibilityValid
  }, [
    box,
    quantityValidation,
    lengthValidation,
    widthValidation,
    heightValidation,
    weightValidation,
    maxHeightValidation,
    isCustomPallet,
    customWidthValidation,
    customDepthValidation,
    customHeightValidation,
    customWeightValidation,
    compatibility,
  ])

  /* Auto-recalc for efficiency strategy only */
  const palletKey = useMemo(
    () =>
      `${palletConfig.type}|${palletConfig.width}|${palletConfig.depth}|${palletConfig.height}|${palletConfig.maxHeight}`,
    [palletConfig],
  )
  const boxKey = useMemo(() => {
    const b = boxes[0]
    if (!b) return "nobox"
    return `${b.quantity}|${b.length}|${b.width}|${b.height}|${b.weight}`
  }, [boxes])

  useEffect(() => {
    if (!isMounted) return
    if (!isFormValid) {
      setCalculation(null)
      return
    }

    setCalcMode("auto")
    const id = setTimeout(async () => {
      try {
        setIsCalculating(true)
        const result = await calculateMultiPalletLayout(boxes, palletConfig, STACKING_PATTERNS.auto)
        setCalculation(result)
        setCurrentLayer(0)
        setCurrentPallet(0)
        setViewMode("full")
      } finally {
        setIsCalculating(false)
        setCalcMode("idle")
      }
    }, 300)
    return () => clearTimeout(id)
  }, [palletKey, boxKey, isFormValid, isMounted])

  /* Current pallet data */
  const currentPalletData = useMemo(() => {
    if (!calculation || calculation.pallets.length === 0) return null
    const p = calculation.pallets[currentPallet]
    if (!p) return null
    return {
      placements: p.placements,
      layers: p.layers,
      boxesPerLayer: p.boxesPerLayer,
      totalBoxes: p.totalBoxes,
      totalWeight: p.totalWeight,
      efficiency: p.efficiency,
      totalHeight: p.totalHeight,
    }
  }, [calculation, currentPallet])

  const deferredCalc = useDeferredValue(currentPalletData)

  /* Can we show 3D? */
  const canShow3D = isFormValid && !!calculation && !calculation.error && calculation.pallets.length > 0

  const loadCalculation = async () => {
    try {
      const saved = await storage.get<{ [key: string]: SavedCalculation }>("palletCalculations")
      if (saved) {
        const currentData = saved[referenceId]
        if (currentData) {
          const oneBox =
            currentData.boxes && currentData.boxes.length > 0
              ? [{ ...currentData.boxes[0], id: "box-0" }]
              : [defaultBox]
          setBoxes(oneBox)
          setPalletConfig(
            currentData.palletConfig || {
              type: "48x40",
              width: 48,
              depth: 40,
              height: 5.5,
              maxHeight: 72,
            },
          )
          const t = (currentData.palletConfig?.type as keyof typeof PALLET_TYPES) || "48x40"
          setPalletWeight(
            typeof currentData.palletWeight === "number"
              ? currentData.palletWeight
              : (PALLET_BASE_WEIGHTS[t] ?? PALLET_BASE_WEIGHTS["48x40"]),
          )
          setCalculation(currentData.calculation)
        } else {
          setBoxes([defaultBox])
          const t = PALLET_TYPES["48x40"]
          setPalletConfig({ type: "48x40", width: t.width, depth: t.depth, height: t.height, maxHeight: 72 })
          setPalletWeight(PALLET_BASE_WEIGHTS["48x40"])
        }
      } else {
        setBoxes([defaultBox])
      }
    } catch {
      toast({ title: "Error", description: "Could not load saved calculation", variant: "destructive" })
      setBoxes([defaultBox])
    }
  }

  /* Updaters */
  const updateBox = useCallback((id: string, updates: Partial<BoxType>) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)))
  }, [])

  const updatePalletConfig = useCallback((updates: Partial<PalletConfig>) => {
    setPalletConfig((prev) => {
      const next = { ...prev, ...updates }
      if (updates.type) {
        if (updates.type !== "custom") {
          const p = PALLET_TYPES[updates.type as keyof typeof PALLET_TYPES]
          if (p) {
            next.width = p.width
            next.depth = p.depth
            next.height = p.height
          }
          setPalletWeight(PALLET_BASE_WEIGHTS[updates.type as keyof typeof PALLET_TYPES])
        } else {
          setPalletWeight((w) => (typeof w === "number" ? w : PALLET_BASE_WEIGHTS.custom))
        }
      }
      return next
    })
  }, [])

  /* Layout Generation Actions */
  const handleCalculate = useCallback(async () => {
    if (!isFormValid) {
      toast({
        title: "Validation Error",
        description: "Please fix all validation errors before calculating",
        variant: "destructive",
      })
      return
    }
    try {
      setCalcMode("manual")
      setIsCalculating(true)
      setCalculation(null)
      const result = await calculateMultiPalletLayout(boxes, palletConfig, stackingPattern)
      setCalculation(result)
      setCurrentLayer(0)
      setCurrentPallet(0)
      setViewMode("full")
      if (result.error) {
        toast({ title: "Calculation Error", description: result.error, variant: "destructive" })
      } else {
        toast({
          title: "Success",
          description: `Layout generated: ${result.totalPallets} pallets, ${result.totalBoxes} boxes, ${result.averageEfficiency.toFixed(1)}% efficiency`,
        })
      }
    } catch {
      toast({ title: "Error", description: "Calculation failed. Please try again.", variant: "destructive" })
    } finally {
      setIsCalculating(false)
      setCalcMode("idle")
    }
  }, [boxes, palletConfig, stackingPattern, isFormValid, toast])

  const handleSave = useCallback(async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const saved = await storage.get<{ [key: string]: SavedCalculation }>("palletCalculations")
      const all = saved || {}

      const updated: SavedCalculation = {
        ...all[referenceId],
        referenceId,
        boxes,
        palletConfig,
        calculation,
        createdAt: all[referenceId]?.createdAt || new Date().toISOString(),
        palletWeight,
      }

      await storage.set("palletCalculations", { ...all, [referenceId]: updated })

      toast({
        title: "💾 Configuration Saved",
        description: `Reference "${referenceId}" successfully saved at ${new Date().toLocaleTimeString()}`,
        variant: "success",
        duration: 4000,
      })

      setLastSaved(new Date())
    } catch (error) {
      toast({
        title: "❌ Save Failed",
        description: "Could not save the calculation. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }, [referenceId, boxes, palletConfig, calculation, palletWeight, toast, isSaving])

  const handleBackToReferences = useCallback(async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const saved = await storage.get<{ [key: string]: SavedCalculation }>("palletCalculations")
      const all = saved || {}

      const updated: SavedCalculation = {
        ...all[referenceId],
        referenceId,
        boxes,
        palletConfig,
        calculation,
        createdAt: all[referenceId]?.createdAt || new Date().toISOString(),
        palletWeight,
      }

      await storage.set("palletCalculations", { ...all, [referenceId]: updated })

      toast({
        title: "💾 Configuration Saved",
        description: `Reference "${referenceId}" saved successfully. Returning to references...`,
        variant: "success",
        duration: 3000,
      })

      setLastSaved(new Date())

      // Small delay to show the toast before navigating
      setTimeout(() => {
        router.push("/")
      }, 500)
    } catch (error) {
      toast({
        title: "❌ Save Failed",
        description: "Could not save the calculation. Returning to references anyway...",
        variant: "destructive",
        duration: 4000,
      })

      // Still navigate even if save fails
      setTimeout(() => {
        router.push("/")
      }, 1000)
    } finally {
      setIsSaving(false)
    }
  }, [referenceId, boxes, palletConfig, calculation, palletWeight, toast, router, isSaving])

  const handleClear = () => setClearDialogOpen(true)
  const confirmClear = () => {
    setCalculation(null)
    setBoxes([defaultBox])
    setClearDialogOpen(false)
    toast({ title: "Success", description: "Calculation cleared" })
  }

  /* Render */
  if (!isMounted) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading calculator...</div>
  }

  if (!box) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Initializing...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Reference ID: {referenceId}</h2>
              <p className="text-sm text-gray-600">Professional Pallet Calculation Session</p>
            </div>
            <Button onClick={handleBackToReferences} variant="outline" size="sm" disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Home className="w-4 h-4 mr-2" />
                  Back to References
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[520px_1fr] gap-6">
          {/* LEFT COLUMN - Configuration */}
          <div className="space-y-4">
            {/* Box Configuration */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <SectionHeader
                  icon={Package}
                  title="Box Configuration"
                  subtitle="Physical properties of shipping boxes"
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quantity & Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <ValidatedInput
                    id={`quantity-${box.id}`}
                    label="Quantity"
                    description="Total boxes to pack"
                    value={box.quantity}
                    onValue={(n) => updateBox(box.id, { quantity: n ? Math.floor(n) : undefined })}
                    validation={quantityValidation}
                    integer
                    required
                    placeholder="Enter quantity"
                    tooltip="How many identical boxes need to be packed on pallets"
                  />

                  <ValidatedInput
                    id={`weight-${box.id}`}
                    label="Weight"
                    description="Per box weight"
                    value={box.weight}
                    onValue={(n) => updateBox(box.id, { weight: n })}
                    validation={weightValidation}
                    step={0.1}
                    required
                    unit="lbs"
                    placeholder="Enter weight"
                    tooltip="Weight of each individual box including contents"
                  />
                </div>

                {/* Dimensions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b border-gray-100 pb-2">
                    <Ruler className="w-4 h-4" />
                    Box Dimensions (External)
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <ValidatedInput
                      id={`length-${box.id}`}
                      label="Length"
                      description="Longest side"
                      value={box.length}
                      onValue={(n) => updateBox(box.id, { length: n })}
                      validation={lengthValidation}
                      step={0.1}
                      required
                      unit="in"
                      placeholder="0.0"
                      tooltip="The longest dimension of the box"
                    />

                    <ValidatedInput
                      id={`width-${box.id}`}
                      label="Width"
                      description="Side to side"
                      value={box.width}
                      onValue={(n) => updateBox(box.id, { width: n })}
                      validation={widthValidation}
                      step={0.1}
                      required
                      unit="in"
                      placeholder="0.0"
                      tooltip="The width of the box"
                    />

                    <ValidatedInput
                      id={`height-${box.id}`}
                      label="Height"
                      description="Bottom to top"
                      value={box.height}
                      onValue={(n) => updateBox(box.id, { height: n })}
                      validation={heightValidation}
                      step={0.1}
                      required
                      unit="in"
                      placeholder="0.0"
                      tooltip="The height of the box when upright"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pallet Configuration */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <SectionHeader
                  icon={Truck}
                  title="Pallet Configuration"
                  subtitle="Pallet type and shipping constraints"
                  badge={isCustomPallet ? "Custom" : "Standard"}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pallet Type & Max Height */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700">Pallet Type</Label>
                      <Tooltip content="Choose from standard pallet sizes or define custom dimensions">
                        <HelpCircle className="text-gray-400 hover:text-gray-600 w-[15px] h-[15px]" />
                      </Tooltip>
                    </div>
                    <p className="text-xs text-gray-500">Standard or custom size</p>
                    <select
                      value={palletConfig.type}
                      onChange={(e) => updatePalletConfig({ type: e.target.value })}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {Object.entries(PALLET_TYPES).map(([key, pallet]) => (
                        <option key={key} value={key}>
                          {pallet.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <ValidatedInput
                    id="max-height"
                    label="Max Height"
                    description="Total height limit"
                    value={palletConfig.maxHeight}
                    onValue={(n) => updatePalletConfig({ maxHeight: n })}
                    validation={maxHeightValidation}
                    integer={false}
                    step={0.1}
                    required
                    unit="in"
                    placeholder="72"
                    tooltip="Maximum total height including pallet (carrier/warehouse limit)"
                  />
                </div>

                {/* Custom Pallet Dimensions */}
                {isCustomPallet && (
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Ruler className="w-4 h-4" />
                      Custom Pallet Specifications
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <ValidatedInput
                        id="custom-width"
                        label="Width"
                        description="Left to right"
                        value={palletConfig.width}
                        onValue={(n) => updatePalletConfig({ width: n })}
                        validation={customWidthValidation}
                        step={0.1}
                        required
                        unit="in"
                        placeholder="48.0"
                        tooltip="The width of the pallet deck"
                      />

                      <ValidatedInput
                        id="custom-depth"
                        label="Depth"
                        description="Front to back"
                        value={palletConfig.depth}
                        onValue={(n) => updatePalletConfig({ depth: n })}
                        validation={customDepthValidation}
                        step={0.1}
                        required
                        unit="in"
                        placeholder="40.0"
                        tooltip="The depth of the pallet deck"
                      />

                      <ValidatedInput
                        id="custom-height"
                        label="Height"
                        description="Deck thickness"
                        value={palletConfig.height}
                        onValue={(n) => updatePalletConfig({ height: n })}
                        validation={customHeightValidation}
                        step={0.1}
                        required
                        unit="in"
                        placeholder="5.5"
                        tooltip="Height of the pallet itself"
                      />

                      <ValidatedInput
                        id="custom-weight"
                        label="Weight"
                        description="Empty pallet"
                        value={palletWeight}
                        onValue={(n) => setPalletWeight(n ? Math.floor(n) : undefined)}
                        validation={customWeightValidation}
                        integer
                        required
                        unit="lbs"
                        placeholder="40"
                        tooltip="Weight of the empty pallet"
                      />
                    </div>
                  </div>
                )}

                {/* Compatibility Warning */}
                <ValidationPanel compatibility={compatibility} isCustomPallet={isCustomPallet} />

                {/* Stacking Pattern */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Stacking Pattern</Label>
                    <Tooltip content="Algorithm automatically optimizes box arrangement for maximum efficiency">
                      <HelpCircle className="text-gray-400 hover:text-gray-600 w-[15px] h-[15px]" />
                    </Tooltip>
                  </div>
                  <p className="text-xs text-gray-500">Optimization algorithm</p>
                  <div className="h-9 w-full rounded-md border bg-gray-50 px-3 flex items-center text-sm text-gray-700 font-medium">
                    <Layers className="w-4 h-4 mr-2 text-gray-600" />
                    {STACKING_PATTERNS.auto}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <Button onClick={handleCalculate} disabled={isCalculating || !isFormValid} className="flex-1 h-9">
                    {isCalculating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {calcMode === "auto" ? "Recalculating..." : "Calculating..."}
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 mr-2" />
                        Generate Layout
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleSave}
                    variant="outline"
                    className="h-9 bg-transparent"
                    disabled={isSaving}
                    title={lastSaved ? `Last auto-saved: ${lastSaved.toLocaleTimeString()}` : "Save manually"}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>

                  <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button onClick={handleClear} variant="destructive" disabled={!calculation} className="h-9">
                        Clear
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Calculation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to clear this pallet calculation? This will reset the box and results.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmClear}>Clear</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - 3D Visualization */}
          <div>
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col space-y-4">
                  {/* Title Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Box className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">3D Visualization</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Interactive pallet layout preview</p>
                      </div>
                    </div>
                  </div>

                  {/* Controls Row */}
                  {canShow3D && calculation && calculation.pallets.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-gray-100">
                      {/* Pallet Navigation */}
                      {calculation.totalPallets > 1 && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Package2 className="w-4 h-4 text-blue-600" />
                            <span>Pallet</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPallet(Math.max(0, currentPallet - 1))}
                              disabled={currentPallet === 0}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-sm font-semibold min-w-[80px] text-center">
                              {currentPallet + 1} of {calculation.totalPallets}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPallet(Math.min(calculation.totalPallets - 1, currentPallet + 1))
                              }
                              disabled={currentPallet === calculation.totalPallets - 1}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Layer Navigation */}
                      {viewMode === "layer" && calculation.pallets[currentPallet]?.layers > 1 && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Layers className="w-4 h-4 text-green-600" />
                            <span>Layer</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentLayer(Math.max(0, currentLayer - 1))}
                              disabled={currentLayer === 0}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="bg-green-50 text-green-700 px-3 py-1 rounded-md text-sm font-semibold min-w-[80px] text-center">
                              {currentLayer + 1} of {calculation.pallets[currentPallet].layers}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentLayer(
                                  Math.min(calculation.pallets[currentPallet].layers - 1, currentLayer + 1),
                                )
                              }
                              disabled={currentLayer === calculation.pallets[currentPallet].layers - 1}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* View Mode Toggle */}
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          variant={viewMode === "full" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setViewMode("full")}
                          className="h-8"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Full View
                        </Button>
                        {calculation.pallets[currentPallet]?.layers > 1 && (
                          <Button
                            variant={viewMode === "layer" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("layer")}
                            className="h-8"
                          >
                            <Layers className="w-4 h-4 mr-1" />
                            Layer View
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="relative">
                  {canShow3D ? (
                    <ThreeDVisualization
                      calculation={deferredCalc}
                      palletConfig={palletConfig}
                      viewMode={viewMode}
                      currentLayer={currentLayer}
                    />
                  ) : (
                    <div className="w-full h-[520px] rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center text-center p-8">
                      <div>
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium mb-2 text-gray-600">Ready for Layout Generation</p>
                        <p className="text-sm text-gray-500 max-w-md">
                          Complete all required fields and use the Layout Generator to create optimized pallet
                          arrangements with different strategies
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pallet Details */}
          {canShow3D && calculation && !calculation.error && calculation.pallets.length > 0 && (
            <div className="lg:col-span-2">
              <CalculationResults
                calculation={calculation}
                currentPallet={currentPallet}
                setCurrentPallet={setCurrentPallet}
                palletConfig={palletConfig}
                palletWeight={palletWeight}
              />
            </div>
          )}

          {calculation?.error && (
            <div className="lg:col-span-2">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-red-600">Calculation Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{calculation.error}</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
