// lib/calculation-worker.ts
// Single-SKU corner/edge-safe palletizer
// - Minimal pallets based on height/capacity
// - Distribute by full layers first, then put the remainder on ONE pallet
// - Partial-top placement: corners first, then edges (no recentring)
// - Never changes total quantity

export interface BoxType {
  id: string
  sku: string
  length: number
  width: number
  height: number
  weight: number
  quantity: number
  color: string
}

export interface PalletConfig {
  type: string
  width: number
  depth: number
  height: number
  maxHeight: number
}

export interface BoxPlacement {
  x: number // center-based X (in)
  z: number // center-based Z (in)
  box: BoxType
  rotation: number // 0 or 90
  layer: number
}

export interface PalletResult {
  palletNumber: number
  placements: BoxPlacement[]
  layers: number
  boxesPerLayer: number
  totalBoxes: number
  totalWeight: number
  efficiency: number
  totalHeight: number
}

export interface CalculationResult {
  pallets: PalletResult[]
  totalPallets: number
  totalBoxes: number
  totalWeight: number
  averageEfficiency: number
  boxDistribution: { [sku: string]: { [palletNumber: number]: number } }
  error?: string
}

const EPS = 1e-6

type Footprint = { len: number; wid: number; rot: 0 | 90 }
type LayerBlock = { cols: number; rows: number; fp: Footprint }
type LayerPattern = {
  kind: 'grid' | 'split-x' | 'split-z'
  blocks: LayerBlock[]
  usedWidth: number
  usedDepth: number
  perLayer: number  // K
  // optional metadata for sanity/debug
  maxCols: number
  maxRows: number
}
type Cell = { x: number; z: number; fp: Footprint }

function clampCenterInsidePallet(
  cx: number, cz: number,
  len: number, wid: number,
  palletW: number, palletD: number
): { cx: number; cz: number } {
  const halfW = palletW / 2, halfD = palletD / 2
  const minCx = -halfW + len / 2 + EPS
  const maxCx =  halfW - len / 2 - EPS
  const minCz = -halfD + wid / 2 + EPS
  const maxCz =  halfD - wid / 2 - EPS
  return {
    cx: Math.max(minCx, Math.min(maxCx, cx)),
    cz: Math.max(minCz, Math.min(maxCz, cz))
  }
}

export async function calculateMultiPalletLayout(
  boxes: BoxType[],
  pallet: PalletConfig,
  _pattern: string
): Promise<CalculationResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        resolve(performCalc(boxes, pallet))
      } catch (e) {
        resolve(emptyResult('Calculation failed'))
      }
    }, 0)
  })
}

function performCalc(boxes: BoxType[], pallet: PalletConfig): CalculationResult {
  if (!pallet || pallet.width <= 0 || pallet.depth <= 0 || pallet.maxHeight <= pallet.height) {
    return emptyResult('Invalid pallet configuration')
  }

    const valid = (boxes || []).filter(b =>
        b && b.length > 0 && b.width > 0 && b.height > 0 &&
        (b.quantity || 0) > 0
    )
    if (valid.length === 0) return emptyResult('No valid boxes with dimensions defined')

  // Single-SKU aggregate
  const base = { ...valid[0] }
  const totalQty = valid.reduce((s, b) => s + (b.quantity || 0), 0)
  base.quantity = totalQty

  // Two candidate footprints (0°, 90°)
  const fp0: Footprint  = { len: base.length, wid: base.width,  rot: 0 }
  const fp90: Footprint = { len: base.width,  wid: base.length, rot: 90 }

  // Choose the best per-layer packing pattern
  const pattern = chooseBestLayerPattern(pallet.width, pallet.depth, fp0, fp90, totalQty)
  if (!pattern || pattern.perLayer === 0) return emptyResult('Box footprint does not fit on pallet area')

  const K = pattern.perLayer
  const layersMax = Math.floor(((pallet.maxHeight - pallet.height) + EPS) / base.height)
  if (layersMax <= 0) return emptyResult('No vertical clearance for a single layer')

  // Minimal number of pallets by true capacity
  const capacityPerPallet = K * layersMax
  const minPallets = Math.max(1, Math.ceil(totalQty / Math.max(1, capacityPerPallet)))

  // Distribute by FULL LAYERS first, then place the remainder on ONE pallet.
  const targets = buildTargetsByFullLayers(totalQty, minPallets, K, layersMax)

  // Build placements for each pallet using the selected pattern
  const palletsOut: PalletResult[] = []
  const dist: { [sku: string]: { [palletNumber: number]: number } } = { [base.sku]: {} }
  let idCounter = 0

  // If every pallet has multiple of K, no partial tops exist
  const allFull = targets.every(t => t % K === 0)

  for (let p = 0; p < targets.length; p++) {
    const t = Math.min(targets[p], capacityPerPallet) // defensive
    const { placements, layersUsed } = buildPlacementsForPallet(
      t, layersMax, pattern, base, pallet,
      () => `${base.id}-${idCounter++}`,
      allFull // if all full, we can skip partial logic entirely
    )

    const count = placements.length
    const usedVol = count * base.length * base.width * base.height
    const capVol  = pallet.width * pallet.depth * (pallet.maxHeight - pallet.height)
    const eff = Math.min(100, (usedVol / Math.max(capVol, EPS)) * 100)

    palletsOut.push({
      palletNumber: p + 1,
      placements,
      layers: layersUsed,
      boxesPerLayer: K,
      totalBoxes: count,
      totalWeight: count * (base.weight || 0),
      efficiency: eff,
      totalHeight: pallet.height + layersUsed * base.height
    })
    dist[base.sku][p + 1] = count
  }

  const totalPallets = palletsOut.length
  const totalBoxes = palletsOut.reduce((s, pr) => s + pr.totalBoxes, 0)
  const totalWeight = palletsOut.reduce((s, pr) => s + pr.totalWeight, 0)
  const avgEff = totalPallets ? palletsOut.reduce((s, pr) => s + pr.efficiency, 0) / totalPallets : 0

  return {
    pallets: palletsOut,
    totalPallets,
    totalBoxes,
    totalWeight,
    averageEfficiency: avgEff,
    boxDistribution: dist
  }
}

function emptyResult(error: string): CalculationResult {
  return { pallets: [], totalPallets: 0, totalBoxes: 0, totalWeight: 0, averageEfficiency: 0, boxDistribution: {}, error }
}

/* ----------------------------------------------------------------------------
   Target distribution: FULL LAYERS FIRST
   - Compute total full layers and a single remainder.
   - Spread the full layers across the minimal number of pallets (<= layersMax each).
   - Put the remainder on ONE pallet (last that still has capacity).
   This avoids multiple sparse top layers and keeps sum exact.
-----------------------------------------------------------------------------*/
function buildTargetsByFullLayers(total: number, pallets: number, K: number, layersMax: number): number[] {
  const totalFullLayers = Math.floor(total / K)        // how many complete layers exist in total
  let rem = total % K                                  // leftover boxes (< K)

  // Base layers per pallet, then distribute the extra layers
  const baseLayers = Math.floor(totalFullLayers / pallets)
  let extraLayers = totalFullLayers % pallets

  const layersPerPallet: number[] = new Array(pallets).fill(baseLayers)
  for (let i = 0; i < pallets; i++) {
    if (extraLayers > 0) {
      layersPerPallet[i]++
      extraLayers--
    }
    // clamp to layersMax (defensive; minPallets ensures we usually don't exceed)
    layersPerPallet[i] = Math.min(layersPerPallet[i], layersMax)
  }

  // Convert layers to counts
  const counts = layersPerPallet.map(L => L * K)

  // Place the remainder on the LAST pallet that still has vertical capacity
  if (rem > 0) {
    for (let i = pallets - 1; i >= 0; i--) {
      if (layersPerPallet[i] < layersMax) {
        counts[i] += rem
        rem = 0
        break
      }
    }
  }

  // If still leftover (all pallets at max layers but we had remainder), spread from the end back
  // (This is extremely rare with minPallets calculation, but we handle it to be safe.)
  let idx = pallets - 1
  while (rem > 0 && idx >= 0) {
    const room = K - (counts[idx] % K || K)
    const take = Math.min(rem, room)
    counts[idx] += take
    rem -= take
    idx--
  }

  // Sanity: keep exact total
  const diff = total - counts.reduce((s, v) => s + v, 0)
  if (diff !== 0) {
    // Adjust last pallet to make sums match (never change sign of quantities)
    counts[counts.length - 1] += diff
  }

  return counts
}

/* ----------------------------------------------------------------------------
   Build all placements for a pallet given a final target count.
   - Fill complete layers using the selected pattern.
   - For a partial layer, pick EXACTLY r cells (corners first, then edges).
-----------------------------------------------------------------------------*/
function buildPlacementsForPallet(
  targetCount: number,
  layersMax: number,
  pattern: LayerPattern,
  base: BoxType,
  pallet: PalletConfig,
  makeId: () => string,
  allFull: boolean
): { placements: BoxPlacement[]; layersUsed: number } {
  const placements: BoxPlacement[] = []
  const K = Math.max(1, pattern.perLayer)

  let remaining = targetCount
  let layerIndex = 0

  // Fill full layers
  const fullLayers = Math.min(Math.floor(remaining / K), layersMax)
  for (let i = 0; i < fullLayers; i++) {
    const cells = materializeLayerCells(pattern, pallet.width, pallet.depth)
    for (const cell of cells) {
      let cx = (cell.x + cell.fp.len / 2) - pallet.width / 2
      let cz = (cell.z + cell.fp.wid / 2) - pallet.depth / 2
      ;({ cx, cz } = clampCenterInsidePallet(cx, cz, cell.fp.len, cell.fp.wid, pallet.width, pallet.depth))
      const inst: BoxType = { ...base, id: makeId() }
      placements.push({ x: cx, z: cz, box: inst, rotation: cell.fp.rot, layer: layerIndex })
    }
    remaining -= K
    layerIndex++
  }

  // Partial layer
  if (remaining > 0 && layerIndex < layersMax) {
    const cells = materializeLayerCells(pattern, pallet.width, pallet.depth)
    const picked = pickCornerEdgePartialCells(cells, remaining) // pick EXACTLY r cells; no recentring
    for (const cell of picked) {
      let cx = (cell.x + cell.fp.len / 2) - pallet.width / 2
      let cz = (cell.z + cell.fp.wid / 2) - pallet.depth / 2
      ;({ cx, cz } = clampCenterInsidePallet(cx, cz, cell.fp.len, cell.fp.wid, pallet.width, pallet.depth))
      const inst: BoxType = { ...base, id: makeId() }
      placements.push({ x: cx, z: cz, box: inst, rotation: cell.fp.rot, layer: layerIndex })
    }
    layerIndex++
    remaining = 0
  }

  return { placements, layersUsed: layerIndex }
}

/* ----------------------------------------------------------------------------
   Pattern search
-----------------------------------------------------------------------------*/
function chooseBestLayerPattern(
  width: number,
  depth: number,
  a: Footprint,
  b: Footprint,
  totalQty: number
): LayerPattern | null {
  const candidates: LayerPattern[] = []
  candidates.push(buildGridPattern(width, depth, a))
  candidates.push(buildGridPattern(width, depth, b))
  candidates.push(...buildSplitXPatterns(width, depth, a, b))
  candidates.push(...buildSplitXPatterns(width, depth, b, a))
  candidates.push(...buildSplitZPatterns(width, depth, a, b))
  candidates.push(...buildSplitZPatterns(width, depth, b, a))

  // Filter out anything that doesn't physically fit
  const viable = candidates.filter(
    (c) => c.perLayer > 0 && c.usedWidth - EPS <= width && c.usedDepth - EPS <= depth
  )
  if (viable.length === 0) return null

  // Lexicographic ranking:
  // 1) per-layer capacity (maximize)
  // 2) used area (maximize) – better footprint utilization
  // 3) squareness (maximize) – prefer more square footprints
  // 4) simplicity (maximize) – fewer blocks is simpler
  // 5) divisibility (boolean) – light preference
  // 6) remainder (minimize)
  const scoreTuple = (c: LayerPattern) => {
    const usedArea = c.usedWidth * c.usedDepth
    const squareness = -Math.abs(c.usedWidth - c.usedDepth)
    const simplicity = -(c.blocks.length - 1)
    const divisible = totalQty % c.perLayer === 0 ? 1 : 0
    const remainder = totalQty % c.perLayer // lower is better

    // Return a tuple for lexicographic compare
    return [
      c.perLayer,      // higher better
      usedArea,        // higher better
      squareness,      // closer to square (less abs diff) is better
      simplicity,      // fewer blocks is better
      divisible,       // light nudge only
      -remainder,      // smaller remainder better
    ] as const
  }

  let best = viable[0]
  let bestKey = scoreTuple(best)

  for (let i = 1; i < viable.length; i++) {
    const key = scoreTuple(viable[i])
    // lexicographic comparison
    let better = false
    for (let k = 0; k < bestKey.length; k++) {
      if (key[k] > bestKey[k]) { better = true; break }
      if (key[k] < bestKey[k]) { better = false; break }
    }
    if (better) {
      best = viable[i]
      bestKey = key
    }
  }

  return best
}

function buildGridPattern(width: number, depth: number, fp: Footprint): LayerPattern {
  const cols = Math.floor(width / fp.len)
  const rows = Math.floor(depth / fp.wid)
  const usedWidth = cols * fp.len
  const usedDepth = rows * fp.wid
  const perLayer = Math.max(0, cols) * Math.max(0, rows)
  return {
    kind: 'grid',
    blocks: [{ cols, rows, fp }],
    usedWidth, usedDepth, perLayer,
    maxCols: cols, maxRows: rows
  }
}

function buildSplitXPatterns(width: number, depth: number, left: Footprint, right: Footprint): LayerPattern[] {
  const res: LayerPattern[] = []
  const maxLeftCols = Math.floor(width / left.len)
  for (let cLeft = 1; cLeft <= maxLeftCols; cLeft++) {
    const remainingW = width - cLeft * left.len
    if (remainingW < 0) break
    const cRight = Math.floor(remainingW / right.len)
    const rowsLeft = Math.floor(depth / left.wid)
    const rowsRight = Math.floor(depth / right.wid)
    const perLayer = cLeft * rowsLeft + cRight * rowsRight
    const usedWidth = cLeft * left.len + cRight * right.len
    const usedDepth = Math.max(rowsLeft * left.wid, rowsRight * right.wid)
    res.push({
      kind: 'split-x',
      blocks: [
        { cols: cLeft, rows: rowsLeft, fp: left },
        { cols: cRight, rows: rowsRight, fp: right }
      ],
      usedWidth, usedDepth, perLayer,
      maxCols: Math.max(cLeft, cRight), maxRows: Math.max(rowsLeft, rowsRight)
    })
  }
  return res
}

function buildSplitZPatterns(width: number, depth: number, front: Footprint, back: Footprint): LayerPattern[] {
  const res: LayerPattern[] = []
  const maxFrontRows = Math.floor(depth / front.wid)
  for (let rFront = 1; rFront <= maxFrontRows; rFront++) {
    const remainingD = depth - rFront * front.wid
    if (remainingD < 0) break
    const rBack = Math.floor(remainingD / back.wid)
    const colsFront = Math.floor(width / front.len)
    const colsBack = Math.floor(width / back.len)
    const perLayer = rFront * colsFront + rBack * colsBack
    const usedDepth = rFront * front.wid + rBack * back.wid
    const usedWidth = Math.max(colsFront * front.len, colsBack * back.len)
    res.push({
      kind: 'split-z',
      blocks: [
        { cols: colsFront, rows: rFront, fp: front },
        { cols: colsBack, rows: rBack, fp: back }
      ],
      usedWidth, usedDepth, perLayer,
      maxCols: Math.max(colsFront, colsBack), maxRows: Math.max(rFront, rBack)
    })
  }
  return res
}

/* ----------------------------------------------------------------------------
   Materialize a layer to concrete cells (absolute pallet coords, 0,0 at front-left)
-----------------------------------------------------------------------------*/
function materializeLayerCells(pattern: LayerPattern, palletW: number, palletD: number): Cell[] {
  const cells: Cell[] = []
  const offsetX = (palletW - pattern.usedWidth) / 2
  const offsetZ = (palletD - pattern.usedDepth) / 2

  if (pattern.kind === 'grid') {
    const b = pattern.blocks[0]
    const blockOffsetX = offsetX + (pattern.usedWidth - b.cols * b.fp.len) / 2
    const blockOffsetZ = offsetZ + (pattern.usedDepth - b.rows * b.fp.wid) / 2
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        const x = blockOffsetX + c * b.fp.len
        const z = blockOffsetZ + r * b.fp.wid
        cells.push({ x, z, fp: b.fp })
      }
    }
    return cells
  }

  if (pattern.kind === 'split-x') {
    const left = pattern.blocks[0]
    const right = pattern.blocks[1]
    let curX = offsetX
    const leftOffsetZ = offsetZ + (pattern.usedDepth - left.rows * left.fp.wid) / 2
    for (let r = 0; r < left.rows; r++) {
      for (let c = 0; c < left.cols; c++) {
        const x = curX + c * left.fp.len
        const z = leftOffsetZ + r * left.fp.wid
        cells.push({ x, z, fp: left.fp })
      }
    }
    curX += left.cols * left.fp.len
    const rightOffsetZ = offsetZ + (pattern.usedDepth - right.rows * right.fp.wid) / 2
    for (let r = 0; r < right.rows; r++) {
      for (let c = 0; c < right.cols; c++) {
        const x = curX + c * right.fp.len
        const z = rightOffsetZ + r * right.fp.wid
        cells.push({ x, z, fp: right.fp })
      }
    }
    return cells
  }

  if (pattern.kind === 'split-z') {
    const front = pattern.blocks[0]
    const back = pattern.blocks[1]
    let curZ = offsetZ
    const frontOffsetX = offsetX + (pattern.usedWidth - front.cols * front.fp.len) / 2
    for (let r = 0; r < front.rows; r++) {
      for (let c = 0; c < front.cols; c++) {
        const x = frontOffsetX + c * front.fp.len
        const z = curZ + r * front.fp.wid
        cells.push({ x, z, fp: front.fp })
      }
    }
    curZ += front.rows * front.fp.wid
    const backOffsetX = offsetX + (pattern.usedWidth - back.cols * back.fp.len) / 2
    for (let r = 0; r < back.rows; r++) {
      for (let c = 0; c < back.cols; c++) {
        const x = backOffsetX + c * back.fp.len
        const z = curZ + r * back.fp.wid
        cells.push({ x, z, fp: back.fp })
      }
    }
    return cells
  }

  return cells
}

/* ----------------------------------------------------------------------------
   Partial selector: pick EXACTLY r cells. Corners first, then edges.
   No recentring. Keeps selections at perimeter so wrap can grab them.
-----------------------------------------------------------------------------*/
function pickCornerEdgePartialCells(cells: Cell[], r: number): Cell[] {
  if (r <= 0) return []

  // Axis-aligned bounds of the occupied grid
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity
  for (const c of cells) {
    minX = Math.min(minX, c.x)
    minZ = Math.min(minZ, c.z)
    maxX = Math.max(maxX, c.x + c.fp.len)
    maxZ = Math.max(maxZ, c.z + c.fp.wid)
  }

  // prefer exact corner cells; else nearest to that corner
  const minCol = Math.min(...cells.map(c => c.x))
  const maxCol = Math.max(...cells.map(c => c.x))
  const minRow = Math.min(...cells.map(c => c.z))
  const maxRow = Math.max(...cells.map(c => c.z))

  const corners = [
    (c: Cell) => c.x === minCol && c.z === minRow, // front-left
    (c: Cell) => c.x === minCol && c.z === maxRow, // back-left
    (c: Cell) => c.x === maxCol && c.z === minRow, // front-right
    (c: Cell) => c.x === maxCol && c.z === maxRow, // back-right
  ]

  const remaining = new Set(cells.map((_, i) => i))
  const picked: number[] = []

  const dist2 = (cell: Cell, px: number, pz: number) => {
    const cx = cell.x + cell.fp.len / 2
    const cz = cell.z + cell.fp.wid / 2
    return (cx - px) * (cx - px) + (cz - pz) * (cz - pz)
  }

  const cornerPoints = [
    { x: minX, z: minZ },
    { x: minX, z: maxZ },
    { x: maxX, z: minZ },
    { x: maxX, z: maxZ },
  ]

  // 1) corners
  for (let k = 0; k < 4 && picked.length < r; k++) {
    const exactIdx = cells.findIndex((c, i) => remaining.has(i) && corners[k](c))
    if (exactIdx !== -1) {
      picked.push(exactIdx)
      remaining.delete(exactIdx)
      continue
    }
    // nearest to that corner
    let best = -1, bestD = Infinity
    for (const i of remaining) {
      const d = dist2(cells[i], cornerPoints[k].x, cornerPoints[k].z)
      if (d < bestD) { bestD = d; best = i }
    }
    if (best !== -1) { picked.push(best); remaining.delete(best) }
  }

  // 2) edges (closest to perimeter)
  const edgeScore = (cell: Cell) => {
    const cx = cell.x + cell.fp.len / 2
    const cz = cell.z + cell.fp.wid / 2
    const left = cx - minX
    const right = maxX - cx
    const front = cz - minZ
    const back = maxZ - cz
    return Math.min(left, right, front, back)
  }

  while (picked.length < r && remaining.size) {
    let best = -1, bestEdge = Infinity
    for (const i of remaining) {
      const e = edgeScore(cells[i])
      if (e < bestEdge) { bestEdge = e; best = i }
    }
    if (best !== -1) { picked.push(best); remaining.delete(best) } else break
  }

  return picked.map(i => cells[i])
}
