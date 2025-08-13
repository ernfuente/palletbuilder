"use client"

// Extracted calculation results for code splitting
import type React from "react"
import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardStat } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layers, ChevronLeft, ChevronRight, Ruler, Truck, HelpCircle, Package, BarChart3 } from "lucide-react"
import type { CalculationResult } from "@/lib/calculation-worker"

interface CalculationResultsProps {
  calculation: CalculationResult
  currentPallet: number
  setCurrentPallet: (pallet: number) => void
  palletConfig: any
  palletWeight: number
}

const Tooltip = memo(function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <div className="group relative inline-block">
      <div className="cursor-help">{children}</div>
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-sm text-white bg-gray-900 rounded-lg shadow-lg">
        {content}
      </div>
    </div>
  )
})

const CalculationResults = memo(function CalculationResults({
  calculation,
  currentPallet,
  setCurrentPallet,
  palletConfig,
  palletWeight,
}: CalculationResultsProps) {
  if (!calculation || calculation.error || calculation.pallets.length === 0) {
    return null
  }

  const currentPalletData = calculation.pallets[currentPallet]

  // Calculate totals across all pallets
  const totalBoxesAllPallets = calculation.totalBoxes
  const totalWeightAllPallets = calculation.totalWeight
  const totalPalletWeight = calculation.totalPallets * palletWeight
  const totalShippingWeight = totalWeightAllPallets + totalPalletWeight
  const averageBoxesPerPallet = Math.round(totalBoxesAllPallets / calculation.totalPallets)
  const averageWeightPerPallet = Math.round(totalWeightAllPallets / calculation.totalPallets)

  return (
    <div className="space-y-6">
      {/* Overall Summary Section */}
      <Card className="shadow-sm border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <BarChart3 className="w-5 h-5" />
            Complete Shipment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Overall Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Tooltip content="Total number of pallets required for this shipment">
              <div>
                <CardStat
                  tone="blue"
                  valueClassName="text-xl md:text-2xl font-bold"
                  value={calculation.totalPallets}
                  label="Total Pallets"
                />
              </div>
            </Tooltip>

            <Tooltip content="Total number of boxes across all pallets">
              <div>
                <CardStat
                  tone="purple"
                  valueClassName="text-xl md:text-2xl font-bold"
                  value={totalBoxesAllPallets.toLocaleString()}
                  label="Total Boxes"
                />
              </div>
            </Tooltip>

            <Tooltip content="Average packing efficiency across all pallets">
              <div>
                <CardStat
                  tone="green"
                  valueClassName="text-xl md:text-2xl font-bold"
                  value={`${calculation.averageEfficiency.toFixed(1)}%`}
                  label="Avg Efficiency"
                />
              </div>
            </Tooltip>

            <Tooltip content="Total shipping weight including all pallets and boxes">
              <div>
                <CardStat
                  tone="orange"
                  valueClassName="text-xl md:text-2xl font-bold"
                  value={`${totalShippingWeight.toLocaleString()} lbs`}
                  label="Total Weight"
                  truncateValue={false}
                />
              </div>
            </Tooltip>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weight Breakdown */}
            <div className="bg-white/70 rounded-lg p-4 border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Weight Breakdown
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total Boxes Weight:</span>
                  <span className="font-semibold text-gray-900">{totalWeightAllPallets.toLocaleString()} lbs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total Pallets Weight:</span>
                  <span className="font-semibold text-gray-900">{totalPalletWeight.toLocaleString()} lbs</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-blue-800 font-medium">Total Shipping Weight:</span>
                  <span className="font-bold text-blue-900 text-lg">{totalShippingWeight.toLocaleString()} lbs</span>
                </div>
              </div>
            </div>

            {/* Distribution Stats */}
            <div className="bg-white/70 rounded-lg p-4 border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Distribution Stats
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Avg Boxes per Pallet:</span>
                  <span className="font-semibold text-gray-900">{averageBoxesPerPallet}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Avg Weight per Pallet:</span>
                  <span className="font-semibold text-gray-900">{averageWeightPerPallet.toLocaleString()} lbs</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-blue-800 font-medium">Pallet Utilization:</span>
                  <span className="font-bold text-blue-900">{calculation.averageEfficiency.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Individual Pallet Summary Table */}
          {calculation.totalPallets > 1 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-blue-800 mb-3">Individual Pallet Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-100 border-b border-blue-200">
                      <th className="text-left p-2 font-medium text-blue-900">Pallet</th>
                      <th className="text-left p-2 font-medium text-blue-900">Dimensions</th>
                      <th className="text-right p-2 font-medium text-blue-900">Boxes</th>
                      <th className="text-right p-2 font-medium text-blue-900">Layers</th>
                      <th className="text-right p-2 font-medium text-blue-900">Box Weight</th>
                      <th className="text-right p-2 font-medium text-blue-900">Total Weight</th>
                      <th className="text-right p-2 font-medium text-blue-900">Efficiency</th>
                      <th className="text-right p-2 font-medium text-blue-900">Height</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculation.pallets.map((pallet, index) => (
                      <tr
                        key={index}
                        className={`border-b border-blue-100 hover:bg-blue-50 cursor-pointer ${
                          index === currentPallet ? "bg-blue-100 font-medium" : ""
                        }`}
                        onClick={() => setCurrentPallet(index)}
                      >
                        <td className="p-2 text-blue-800">#{index + 1}</td>
                        <td className="p-2 text-blue-800 font-mono text-sm px-0 py-2">
                          {(palletConfig.width || 0).toFixed(0)}"×{(palletConfig.depth || 0).toFixed(0)}"×
                          {pallet.totalHeight.toFixed(1)}"
                        </td>
                        <td className="p-2 text-right">{pallet.totalBoxes}</td>
                        <td className="p-2 text-right">{pallet.layers}</td>
                        <td className="p-2 text-right">{pallet.totalWeight.toFixed(0)} lbs</td>
                        <td className="p-2 text-right font-medium">
                          {(pallet.totalWeight + palletWeight).toFixed(0)} lbs
                        </td>
                        <td className="p-2 text-right">{pallet.efficiency.toFixed(1)}%</td>
                        <td className="p-2 text-right">{pallet.totalHeight.toFixed(1)}"</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-600 mt-2">* Click on any row to view that pallet in detail below</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Pallet Details */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Pallet {currentPallet + 1} Details
            </span>
            {calculation.totalPallets > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPallet(Math.max(0, currentPallet - 1))}
                  disabled={currentPallet === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full">
                  {currentPallet + 1} of {calculation.totalPallets}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPallet(Math.min(calculation.totalPallets - 1, currentPallet + 1))}
                  disabled={currentPallet === calculation.totalPallets - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current Pallet Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Tooltip content="Total number of boxes placed on this pallet">
              <div>
                <CardStat
                  tone="purple"
                  valueClassName="text-xl md:text-2xl font-bold"
                  value={currentPalletData.totalBoxes}
                  label="Total Boxes"
                />
              </div>
            </Tooltip>

            <Tooltip content="Number of horizontal layers of boxes stacked on this pallet">
              <div>
                <CardStat
                  tone="green"
                  valueClassName="text-xl md:text-2xl font-bold"
                  value={currentPalletData.layers}
                  label="Stacking Layers"
                />
              </div>
            </Tooltip>

            <Tooltip content="Actual number of boxes placed in each horizontal layer for this calculation">
              <div>
                <CardStat
                  tone="blue"
                  valueClassName="text-xl md:text-2xl font-bold"
                  value={currentPalletData.boxesPerLayer}
                  label="Boxes per Layer"
                />
              </div>
            </Tooltip>

            <Tooltip content="Percentage of available pallet space being utilized by the boxes">
              <div>
                <CardStat
                  tone="orange"
                  valueClassName="text-xl md:text-2xl font-bold"
                  value={`${currentPalletData.efficiency.toFixed(1)}%`}
                  label="Packing Efficiency"
                />
              </div>
            </Tooltip>
          </div>

          {/* Detailed Information Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Physical Specifications */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Ruler className="w-5 h-5 text-gray-600" />
                <h4 className="text-lg font-semibold text-gray-800">Physical Specifications</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <Tooltip content="External dimensions of the pallet including the total height with all stacked boxes">
                    <span className="text-sm font-medium text-gray-600 cursor-help flex items-center gap-1">
                      Pallet Dimensions (W×D×H)
                      <HelpCircle className="w-3 h-3" />
                    </span>
                  </Tooltip>
                  <span className="text-lg font-bold text-gray-900">
                    {(palletConfig.width || 0).toFixed(0)}"×{(palletConfig.depth || 0).toFixed(0)}"×
                    {currentPalletData.totalHeight.toFixed(1)}"
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <Tooltip content="Weight of the empty pallet before adding any boxes">
                    <span className="text-sm font-medium text-gray-600 cursor-help flex items-center gap-1">
                      Empty Pallet Weight
                      <HelpCircle className="w-3 h-3" />
                    </span>
                  </Tooltip>
                  <span className="text-lg font-bold text-gray-900">{palletWeight.toFixed(0)} lbs</span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <Tooltip content="Available height for stacking boxes (max height minus pallet height)">
                    <span className="text-sm font-medium text-gray-600 cursor-help flex items-center gap-1">
                      Available Stacking Height
                      <HelpCircle className="w-3 h-3" />
                    </span>
                  </Tooltip>
                  <span className="text-lg font-bold text-gray-900">
                    {(palletConfig.maxHeight - palletConfig.height).toFixed(1)}"
                  </span>
                </div>
              </div>
            </div>

            {/* Weight & Shipping Information */}
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-blue-600" />
                <h4 className="text-lg font-semibold text-blue-800">Weight & Shipping</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <Tooltip content="Combined weight of all boxes on this pallet (excluding pallet weight)">
                    <span className="text-sm font-medium text-blue-700 cursor-help flex items-center gap-1">
                      Total Boxes Weight
                      <HelpCircle className="w-3 h-3" />
                    </span>
                  </Tooltip>
                  <span className="text-lg font-bold text-blue-900">
                    {currentPalletData.totalWeight.toFixed(0)} lbs
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <Tooltip content="Total shipping weight including both the pallet and all boxes - important for freight calculations">
                    <span className="text-sm font-medium text-blue-700 cursor-help flex items-center gap-1">
                      Total Pallet Weight
                      <HelpCircle className="w-3 h-3" />
                    </span>
                  </Tooltip>
                  <span className="text-xl font-bold text-blue-900">
                    {(currentPalletData.totalWeight + palletWeight).toFixed(0)} lbs
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <Tooltip content="Average weight per box on this pallet">
                    <span className="text-sm font-medium text-blue-700 cursor-help flex items-center gap-1">
                      Average Box Weight
                      <HelpCircle className="w-3 h-3" />
                    </span>
                  </Tooltip>
                  <span className="text-lg font-bold text-blue-900">
                    {currentPalletData.totalBoxes > 0
                      ? (currentPalletData.totalWeight / currentPalletData.totalBoxes).toFixed(1)
                      : "0"}{" "}
                    lbs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export default CalculationResults
