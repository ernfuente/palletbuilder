"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Trash2, Calculator, Package, Calendar, Eye, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { storage } from "@/lib/storage"
import dynamic from "next/dynamic"

const ThreeDVisualization = dynamic(() => import("../components/ThreeDVisualization"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[260px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
      Loading preview...
    </div>
  ),
})

const PALLET_TYPES = {
  "48x40": { width: 48, depth: 40, height: 5.5, name: '48" × 40"' },
  "48x48": { width: 48, depth: 48, height: 5.5, name: '48" × 48"' },
  "48x80": { width: 48, depth: 80, height: 5.5, name: '48" × 80"' },
  custom: { width: 48, depth: 40, height: 5.5, name: "Custom Size" },
} as const

interface SavedCalculation {
  referenceId: string
  boxes: any[]
  palletConfig: any
  calculation: any
  createdAt: string
}

const normalizeId = (s: string) => s.trim().toLowerCase()

/* ---------- helper to build per-pallet data safely ---------- */
function getPalletData(calc: SavedCalculation, index: number) {
  const pallets = calc?.calculation?.pallets
  if (!pallets || !pallets[index]) return null
  const p = pallets[index]
  return {
    placements: p.placements ?? [],
    layers: p.layers ?? 0,
    boxesPerLayer: p.boxesPerLayer ?? 0,
    totalBoxes: p.totalBoxes ?? 0,
    totalWeight: p.totalWeight ?? 0,
    totalHeight: p.totalHeight ?? calc.palletConfig.height ?? 0,
  }
}

/* ---------- Card component (separate = fewer JSX/brace gotchas) ---------- */
function ReferenceCard(props: {
  calc: SavedCalculation
  deleteDialogOpen: boolean
  referenceToDelete: string | null
  onRequestDelete: (refId: string) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onOpenReference: (refId: string) => void
}) {
  const {
    calc,
    deleteDialogOpen,
    referenceToDelete,
    onRequestDelete,
    onConfirmDelete,
    onCancelDelete,
    onOpenReference,
  } = props

  const totalPallets: number = calc?.calculation?.totalPallets || calc?.calculation?.pallets?.length || 0

  const [activePallet, setActivePallet] = useState(0)

  useEffect(() => {
    setActivePallet(0)
  }, [totalPallets])

  const data = getPalletData(calc, activePallet)

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate">{calc.referenceId}</CardTitle>

          <AlertDialog
            open={deleteDialogOpen && referenceToDelete === calc.referenceId}
            onOpenChange={(open) => {
              // Close dialog on ESC / outside click
              if (!open) onCancelDelete()
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onRequestDelete(calc.referenceId)
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Reference</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete reference "{calc.referenceId}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={onCancelDelete}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirmDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          {new Date(calc.createdAt).toLocaleDateString()}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 3D preview (static) */}
        <div className="relative overflow-hidden rounded-lg mb-3 h-[260px] md:h-[280px] bg-gray-50 p-2">
          <div className="w-full h-full">
            {data ? (
              <ThreeDVisualization
                calculation={data}
                palletConfig={calc.palletConfig}
                viewMode="full"
                currentLayer={0}
                isThumbnail
                static3D
              />
            ) : (
              <div className="w-full h-full bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No Layout Generated</p>
                </div>
              </div>
            )}
          </div>

          {/* Pallet pager (if multiple pallets) */}
          {totalPallets > 1 && (
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full shadow px-2 py-1 flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 bg-transparent"
                onClick={(e) => {
                  e.stopPropagation()
                  setActivePallet((p) => Math.max(0, p - 1))
                }}
                disabled={activePallet === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium px-2">
                {activePallet + 1} / {totalPallets}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 bg-transparent"
                onClick={(e) => {
                  e.stopPropagation()
                  setActivePallet((p) => Math.min(totalPallets - 1, p + 1))
                }}
                disabled={activePallet === totalPallets - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Pallet chip */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Pallet Type:</span>
          <Badge variant="secondary">
            {PALLET_TYPES[calc.palletConfig.type as keyof typeof PALLET_TYPES]?.name || calc.palletConfig.type}
          </Badge>
        </div>

        {/* Details */}
        {data ? (
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mb-4">
            <div className="text-gray-600">Pallet Dimensions:</div>
            <div className="text-right font-medium">
              {(calc.palletConfig.width || 0).toFixed(0)}" × {(calc.palletConfig.depth || 0).toFixed(0)}" ×{" "}
              {Number(data.totalHeight || 0).toFixed(1)}"
            </div>

            <div className="text-gray-600">Weight:</div>
            <div className="text-right font-medium">{Number(data.totalWeight || 0).toFixed(0)} lbs</div>

            <div className="text-gray-600">Total Boxes:</div>
            <div className="text-right font-medium">{data.totalBoxes}</div>

            <div className="text-gray-600">Layers:</div>
            <div className="text-right font-medium">{data.layers}</div>

            <div className="text-gray-600">Boxes per Layer:</div>
            <div className="text-right font-medium">{data.boxesPerLayer}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 mb-4">No pallet details available.</div>
        )}

        <Button className="w-full" onClick={() => onOpenReference(calc.referenceId)}>
          <Eye className="w-4 h-4 mr-2" />
          Open Reference
        </Button>
      </CardContent>
    </Card>
  )
}

/* ================================ PAGE ================================ */

export default function HomePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([])
  const [newReferenceId, setNewReferenceId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  // central delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [referenceToDelete, setReferenceToDelete] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
    loadSavedCalculations()
  }, [])

  // inside HomePage()
  const cancelDelete = () => {
    setDeleteDialogOpen(false)
    setReferenceToDelete(null)
  }

  const loadSavedCalculations = async () => {
    try {
      const saved = await storage.get<{ [key: string]: SavedCalculation }>("palletCalculations")
      if (saved) {
        const arr = Object.values(saved) as SavedCalculation[]
        setSavedCalculations(arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      } else {
        setSavedCalculations([])
      }
    } catch {
      toast({ title: "Error", description: "Failed to load saved calculations", variant: "destructive" })
    }
  }

  // live duplicate guard
  const existingIdSet = useMemo(
    () => new Set(savedCalculations.map((c) => normalizeId(c.referenceId))),
    [savedCalculations],
  )
  const typedIdNorm = normalizeId(newReferenceId)
  const isDuplicate = !!typedIdNorm && existingIdSet.has(typedIdNorm)
  const canSubmit = !!typedIdNorm && !isDuplicate

  // search filter
  const filteredCalculations = useMemo(() => {
    const q = normalizeId(searchQuery)
    if (!q) return savedCalculations
    return savedCalculations.filter((c) => normalizeId(c.referenceId).includes(q))
  }, [savedCalculations, searchQuery])

  const createNewReference = async () => {
    if (!typedIdNorm) {
      toast({ title: "Validation Error", description: "Please enter a reference ID", variant: "destructive" })
      return
    }
    try {
      const saved = await storage.get<{ [key: string]: SavedCalculation }>("palletCalculations")
      const all = saved || {}

      if (Object.keys(all).some((k) => normalizeId(k) === typedIdNorm)) {
        toast({
          title: "Reference Exists",
          description: "Reference ID already exists. Please choose a different one.",
          variant: "destructive",
        })
        return
      }

      const def = PALLET_TYPES["48x40"]
      const referenceId = newReferenceId.trim()

      if (!referenceId) {
        toast({ title: "Error", description: "Invalid reference ID", variant: "destructive" })
        return
      }

      const newCalc: SavedCalculation = {
        referenceId,
        boxes: [
          {
            id: "box-0",
            sku: "",
            length: 0,
            width: 0,
            height: 0,
            weight: 0,
            quantity: 0,
            color: "#ef4444",
          },
        ],
        palletConfig: {
          type: "48x40",
          width: def.width,
          depth: def.depth,
          height: def.height,
          maxHeight: 72,
        },
        calculation: null,
        createdAt: new Date().toISOString(),
      }

      all[referenceId] = newCalc
      await storage.set("palletCalculations", all)

      setNewReferenceId("")
      await loadSavedCalculations()

      toast({ title: "Success", description: "Reference created successfully" })
      router.push(`/calculator/${encodeURIComponent(referenceId)}`)
    } catch {
      toast({ title: "Error", description: "Failed to create reference. Please try again.", variant: "destructive" })
    }
  }

  // delete handlers (shared)
  const handleDeleteClick = (referenceId: string) => {
    setReferenceToDelete(referenceId)
    setDeleteDialogOpen(true)
  }
  const confirmDelete = async () => {
    if (!referenceToDelete) return
    try {
      const saved = await storage.get<{ [key: string]: SavedCalculation }>("palletCalculations")
      if (saved) {
        delete saved[referenceToDelete]
        await storage.set("palletCalculations", saved)
        await loadSavedCalculations()
        toast({ title: "Success", description: "Reference deleted successfully" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete reference. Please try again.", variant: "destructive" })
    } finally {
      setDeleteDialogOpen(false)
      setReferenceToDelete(null)
    }
  }

  const openReference = (referenceId: string) => {
    if (!referenceId || referenceId.trim() === "") {
      toast({ title: "Error", description: "Invalid reference ID", variant: "destructive" })
      return
    }
    router.push(`/calculator/${encodeURIComponent(referenceId)}`)
  }

  if (!isMounted) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Professional Pallet Calculator</h1>
          <p className="text-lg text-gray-600">Plan smarter. Pack tighter. Preview in 3D.</p>
        </div>

        {/* Create new */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
              <div className="flex-1">
                <Label htmlFor="reference-id">Reference ID</Label>
                <Input
                  id="reference-id"
                  placeholder="Enter unique reference ID (e.g., ORDER-001, PROJECT-A)"
                  value={newReferenceId}
                  onChange={(e) => setNewReferenceId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canSubmit && createNewReference()}
                  aria-invalid={isDuplicate ? "true" : "false"}
                  aria-describedby={isDuplicate ? "refid-error" : undefined}
                  className={isDuplicate ? "border-red-500 focus-visible:ring-red-500" : undefined}
                />
                {isDuplicate && (
                  <p id="refid-error" role="alert" className="mt-1 text-xs text-red-600">
                    This reference ID is already in use.
                    {(() => {
                      const base = newReferenceId.trim().replace(/-\d+$/, "")
                      let n = 2
                      while (existingIdSet.has(normalizeId(`${base}-${n}`))) n++
                      const suggestion = `${base}-${n}`
                      return (
                        <>
                          {" "}
                          Try{" "}
                          <button
                            type="button"
                            className="underline decoration-dotted hover:opacity-80"
                            onClick={() => setNewReferenceId(suggestion)}
                          >
                            “{suggestion}”
                          </button>
                          .
                        </>
                      )
                    })()}
                  </p>
                )}
              </div>

              <div className="flex items-end justify-end">
                <Button onClick={createNewReference} disabled={!canSubmit} className="whitespace-nowrap">
                  <Calculator className="w-4 h-4 mr-2" />
                  Create Reference
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saved + Search */}
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Saved References ({filteredCalculations.length})
            </CardTitle>

            <div className="w-full sm:w-80">
              <Label htmlFor="search" className="sr-only">
                Search references
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by Reference ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {filteredCalculations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No matching references</h3>
                <p>Try a different search term or create a new reference above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCalculations.map((calc) => (
                  <ReferenceCard
                    key={calc.referenceId}
                    calc={calc}
                    deleteDialogOpen={deleteDialogOpen}
                    referenceToDelete={referenceToDelete}
                    onRequestDelete={handleDeleteClick}
                    onConfirmDelete={confirmDelete}
                    onCancelDelete={cancelDelete}
                    onOpenReference={openReference}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
