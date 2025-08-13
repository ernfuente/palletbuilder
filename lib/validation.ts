// lib/validation.ts

/* ---------- Types ---------- */
export interface ValidationError {
  field: string
  code: string
  message: string
  suggestion?: string
  severity: "error" | "warning"
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export interface FieldValidationResult {
  isValid: boolean
  error?: string
  suggestion?: string
}

export interface BoxDimensions {
  length: number
  width: number
  height: number
  weight?: number
  quantity?: number
}

export interface PalletConfig {
  width: number
  depth: number
  height: number
  maxHeight: number
}

/* ---------- Limits ---------- */
export const DEFAULT_LIMITS = {
  boxMinDimIn: 0.1,
  boxMaxDimIn: 120,
  boxMaxWeightLbs: 1500,
  boxMaxQuantity: 100000,
  customPalletMinWidthIn: 32,
  customPalletMinDepthIn: 30,
  customPalletMinHeightIn: 4.5,
  customPalletMaxHeightIn: 7,
  customPalletMaxWeightLbs: 70,
  overallMaxHeightIn: 102,
} as const

/* ---------- Helper Functions ---------- */
const isFiniteNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n)

function createFieldResult(isValid: boolean, error?: string, suggestion?: string): FieldValidationResult {
  return { isValid, error, suggestion }
}

/* ---------- Individual Field Validators ---------- */

export function validateQuantity(quantity: number | undefined): FieldValidationResult {
  if (!isFiniteNum(quantity)) {
    return createFieldResult(false, "Quantity is required", "Enter a number greater than 0")
  }
  if (!Number.isInteger(quantity)) {
    return createFieldResult(false, "Must be a whole number", "Enter a whole number (no decimals)")
  }
  if (quantity <= 0) {
    return createFieldResult(false, "Must be greater than 0", "Enter a positive number of boxes")
  }
  if (quantity > DEFAULT_LIMITS.boxMaxQuantity) {
    return createFieldResult(
      false,
      "Exceeds maximum limit",
      `Maximum is ${DEFAULT_LIMITS.boxMaxQuantity.toLocaleString()}`,
    )
  }
  return createFieldResult(true)
}

export function validateBoxDimension(value: number | undefined, fieldName: string): FieldValidationResult {
  if (!isFiniteNum(value)) {
    return createFieldResult(false, `${fieldName} is required`, `Enter the ${fieldName.toLowerCase()} in inches`)
  }
  if (value <= DEFAULT_LIMITS.boxMinDimIn) {
    return createFieldResult(false, "Too small", "Must be at least 0.1 inches")
  }
  if (value > DEFAULT_LIMITS.boxMaxDimIn) {
    return createFieldResult(false, "Too large", "Cannot exceed 120 inches")
  }
  return createFieldResult(true)
}

export function validateBoxWeight(weight: number | undefined): FieldValidationResult {
  if (!isFiniteNum(weight)) {
    return createFieldResult(false, "Weight is required", "Enter the weight in pounds")
  }
  if (weight < 0) {
    return createFieldResult(false, "Cannot be negative", "Enter 0 or greater")
  }
  if (weight > DEFAULT_LIMITS.boxMaxWeightLbs) {
    return createFieldResult(false, "Too heavy", `Maximum is ${DEFAULT_LIMITS.boxMaxWeightLbs} lbs`)
  }
  return createFieldResult(true)
}

export function validatePalletDimension(value: number | undefined, fieldName: string): FieldValidationResult {
  if (!isFiniteNum(value)) {
    return createFieldResult(false, `${fieldName} is required`, `Enter the ${fieldName.toLowerCase()} in inches`)
  }
  return createFieldResult(true)
}

export function validateMaxHeight(maxHeight: number | undefined, boxHeight?: number): FieldValidationResult {
  if (!isFiniteNum(maxHeight)) {
    return createFieldResult(false, "Max height is required", "Enter the total height limit")
  }
  if (maxHeight > DEFAULT_LIMITS.overallMaxHeightIn) {
    return createFieldResult(false, "Exceeds carrier limit", `Maximum is ${DEFAULT_LIMITS.overallMaxHeightIn} inches`)
  }
  if (boxHeight && maxHeight <= boxHeight) {
    return createFieldResult(false, "Too low for box", "Must be greater than box height for stacking")
  }
  return createFieldResult(true)
}

export function validateCustomPalletWidth(width: number | undefined): FieldValidationResult {
  if (!isFiniteNum(width)) {
    return createFieldResult(false, "Width is required", "Enter the pallet width")
  }
  if (width < DEFAULT_LIMITS.customPalletMinWidthIn) {
    return createFieldResult(false, "Too narrow", `Minimum is ${DEFAULT_LIMITS.customPalletMinWidthIn} inches`)
  }
  return createFieldResult(true)
}

export function validateCustomPalletDepth(depth: number | undefined): FieldValidationResult {
  if (!isFiniteNum(depth)) {
    return createFieldResult(false, "Depth is required", "Enter the pallet depth")
  }
  if (depth < DEFAULT_LIMITS.customPalletMinDepthIn) {
    return createFieldResult(false, "Too shallow", `Minimum is ${DEFAULT_LIMITS.customPalletMinDepthIn} inches`)
  }
  return createFieldResult(true)
}

export function validateCustomPalletHeight(height: number | undefined): FieldValidationResult {
  if (!isFiniteNum(height)) {
    return createFieldResult(false, "Height is required", "Enter the pallet deck height")
  }
  if (height < DEFAULT_LIMITS.customPalletMinHeightIn || height > DEFAULT_LIMITS.customPalletMaxHeightIn) {
    return createFieldResult(
      false,
      "Out of range",
      `Must be ${DEFAULT_LIMITS.customPalletMinHeightIn}-${DEFAULT_LIMITS.customPalletMaxHeightIn} inches`,
    )
  }
  return createFieldResult(true)
}

export function validateCustomPalletWeight(weight: number | undefined): FieldValidationResult {
  if (!isFiniteNum(weight) || weight <= 0) {
    return createFieldResult(false, "Weight is required", "Enter the pallet weight")
  }
  if (weight > DEFAULT_LIMITS.customPalletMaxWeightLbs) {
    return createFieldResult(false, "Too heavy", `Maximum is ${DEFAULT_LIMITS.customPalletMaxWeightLbs} lbs`)
  }
  return createFieldResult(true)
}

/* ---------- Compatibility Validation ---------- */
export function validateBoxPalletCompatibility(
  box: Pick<BoxDimensions, "length" | "width" | "height">,
  pallet: PalletConfig,
): { canFit: boolean; hasVerticalSpace: boolean; error?: string } {
  if (!isFiniteNum(box.height) || !isFiniteNum(pallet.height) || !isFiniteNum(pallet.maxHeight)) {
    return { canFit: true, hasVerticalSpace: true }
  }

  const usableHeight = pallet.maxHeight - pallet.height
  const hasVerticalSpace = box.height <= usableHeight

  // Check horizontal fit (both orientations)
  const fitsNormal = (box.length || 0) <= pallet.width && (box.width || 0) <= pallet.depth
  const fitsRotated = (box.width || 0) <= pallet.width && (box.length || 0) <= pallet.depth
  const canFit = fitsNormal || fitsRotated

  let error: string | undefined
  if (!hasVerticalSpace) {
    error = "Box too tall for available stacking space"
  } else if (!canFit) {
    error = "Box footprint too large for pallet"
  }

  return { canFit, hasVerticalSpace, error }
}

/* ---------- Overall Validation ---------- */
export function validateForCalculation(
  box: BoxDimensions,
  pallet: PalletConfig,
  palletWeight?: number,
  isCustomPallet = false,
): ValidationResult {
  const errors: ValidationError[] = []

  // Box validation
  const quantityResult = validateQuantity(box.quantity)
  if (!quantityResult.isValid) {
    errors.push({ field: "quantity", code: "INVALID", message: quantityResult.error!, severity: "error" })
  }

  const lengthResult = validateBoxDimension(box.length, "Length")
  if (!lengthResult.isValid) {
    errors.push({ field: "length", code: "INVALID", message: lengthResult.error!, severity: "error" })
  }

  const widthResult = validateBoxDimension(box.width, "Width")
  if (!widthResult.isValid) {
    errors.push({ field: "width", code: "INVALID", message: widthResult.error!, severity: "error" })
  }

  const heightResult = validateBoxDimension(box.height, "Height")
  if (!heightResult.isValid) {
    errors.push({ field: "height", code: "INVALID", message: heightResult.error!, severity: "error" })
  }

  const weightResult = validateBoxWeight(box.weight)
  if (!weightResult.isValid) {
    errors.push({ field: "weight", code: "INVALID", message: weightResult.error!, severity: "error" })
  }

  // Pallet validation
  const palletWidthResult = validatePalletDimension(pallet.width, "Width")
  if (!palletWidthResult.isValid) {
    errors.push({ field: "palletWidth", code: "INVALID", message: palletWidthResult.error!, severity: "error" })
  }

  const palletDepthResult = validatePalletDimension(pallet.depth, "Depth")
  if (!palletDepthResult.isValid) {
    errors.push({ field: "palletDepth", code: "INVALID", message: palletDepthResult.error!, severity: "error" })
  }

  const palletHeightResult = validatePalletDimension(pallet.height, "Height")
  if (!palletHeightResult.isValid) {
    errors.push({ field: "palletHeight", code: "INVALID", message: palletHeightResult.error!, severity: "error" })
  }

  const largestBoxDim = Math.max(box.length || 0, box.width || 0, box.height || 0)
  const maxHeightResult = validateMaxHeight(pallet.maxHeight, largestBoxDim)
  if (!maxHeightResult.isValid) {
    errors.push({ field: "maxHeight", code: "INVALID", message: maxHeightResult.error!, severity: "error" })
  }

  // Custom pallet validation
  if (isCustomPallet) {
    const customWidthResult = validateCustomPalletWidth(pallet.width)
    if (!customWidthResult.isValid) {
      errors.push({ field: "customWidth", code: "INVALID", message: customWidthResult.error!, severity: "error" })
    }

    const customDepthResult = validateCustomPalletDepth(pallet.depth)
    if (!customDepthResult.isValid) {
      errors.push({ field: "customDepth", code: "INVALID", message: customDepthResult.error!, severity: "error" })
    }

    const customHeightResult = validateCustomPalletHeight(pallet.height)
    if (!customHeightResult.isValid) {
      errors.push({ field: "customHeight", code: "INVALID", message: customHeightResult.error!, severity: "error" })
    }

    const customWeightResult = validateCustomPalletWeight(palletWeight)
    if (!customWeightResult.isValid) {
      errors.push({ field: "customWeight", code: "INVALID", message: customWeightResult.error!, severity: "error" })
    }
  }

  // Compatibility validation
  const compatibility = validateBoxPalletCompatibility(box, pallet)
  if (compatibility.error) {
    errors.push({ field: "compatibility", code: "INVALID", message: compatibility.error, severity: "error" })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  }
}
