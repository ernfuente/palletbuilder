"use client"

import React, { useRef, useEffect } from "react"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import type { Object3DEventMap, PerspectiveCamera } from "three"

/* ---------- Types ---------- */
interface BoxType {
  id: string
  sku: string
  length: number
  width: number
  height: number
  weight: number
  quantity: number
  color: string
}
interface BoxPlacement {
  x: number
  z: number
  box: BoxType
  rotation: number
  layer: number
}
interface CalculationResult {
  placements: BoxPlacement[]
  layers?: number
  boxesPerLayer?: number
  totalBoxes?: number
  totalWeight?: number
  efficiency?: number
  totalHeight?: number
}
interface PalletConfig {
  width: number
  depth: number
  height: number
  maxHeight: number
}
interface Props {
  calculation: CalculationResult | null
  palletConfig: PalletConfig
  viewMode: "full" | "layer"
  currentLayer: number
  isThumbnail?: boolean
  static3D?: boolean // 👈 NEW
}

/* ---------- Tiny SVG thumbnail ---------- */
const ThumbnailVisualization = React.memo(
  ({ calculation, palletConfig }: { calculation: CalculationResult | null; palletConfig: PalletConfig }) => {
    const { width: pw, depth: pd } = palletConfig
    const vbW = 100,
      vbH = 100,
      pad = 10
    const scale = Math.min((vbW - pad * 2) / pw, (vbH - pad * 2) / pd)
    const w = pw * scale,
      h = pd * scale
    const x0 = (vbW - w) / 2,
      y0 = (vbH - h) / 2

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${vbW} ${vbH}`} className="bg-gray-50">
        <rect x={x0} y={y0} width={w} height={h} fill="#B07A3C" stroke="#875A2A" strokeWidth="0.6" rx="1.5" />
        {calculation?.placements?.map((p, i) => {
          const { box, rotation, x, z } = p
          const bw = (rotation === 90 ? box.width : box.length) * scale
          const bd = (rotation === 90 ? box.length : box.width) * scale
          const sx = x0 + (x + pw / 2 - (rotation === 90 ? box.width : box.length) / 2) * scale
          const sy = y0 + (z + pd / 2 - (rotation === 90 ? box.length : box.width) / 2) * scale
          return (
            <rect
              key={i}
              x={sx}
              y={sy}
              width={bw}
              height={bd}
              fill="#E8C890"
              stroke="#C59F6C"
              strokeWidth="0.3"
              rx="0.6"
            />
          )
        })}
      </svg>
    )
  },
)
ThumbnailVisualization.displayName = "ThumbnailVisualization"

/* ---------- Kraft look (balanced quality) ---------- */
function smoothNoise(size: number, octaves = 3) {
  const c = document.createElement("canvas")
  c.width = c.height = size
  const ctx = c.getContext("2d")!
  const data = ctx.createImageData(size, size)
  const gs = 64
  const grid: number[][] = []
  for (let y = 0; y <= size; y += gs) {
    const row: number[] = []
    for (let x = 0; x <= size; x += gs) row.push(Math.random())
    grid.push(row)
  }
  function s(x: number, y: number) {
    const gx = x / gs,
      gy = y / gs,
      x0 = Math.floor(gx),
      y0 = Math.floor(gy),
      x1 = x0 + 1,
      y1 = y0 + 1
    const sx = gx - x0,
      sy = gy - y0
    const g00 = grid[y0 % grid.length][x0 % grid[0].length]
    const g10 = grid[y0 % grid.length][x1 % grid[0].length]
    const g01 = grid[y1 % grid.length][x0 % grid[0].length]
    const g11 = grid[y1 % grid.length][x1 % grid[0].length]
    const ix0 = g00 * (1 - sx) + g10 * sx,
      ix1 = g01 * (1 - sx) + g11 * sx
    return ix0 * (1 - sy) + ix1 * sy
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0,
        amp = 1,
        freq = 1,
        norm = 0
      for (let o = 0; o < octaves; o++) {
        v += s(x * freq, y * freq) * amp
        norm += amp
        amp *= 0.5
        freq *= 2
      }
      v /= norm
      v = 0.5 + (v - 0.5) * 0.1
      const i = (y * size + x) * 4
      const g = Math.floor(v * 255)
      data.data[i] = data.data[i + 1] = data.data[i + 2] = g
      data.data[i + 3] = 255
    }
  }
  ctx.putImageData(data, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}
function fibersTexture(size: number) {
  const c = document.createElement("canvas")
  c.width = c.height = size
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#808080"
  ctx.fillRect(0, 0, size, size)
  ctx.globalAlpha = 0.08
  ctx.strokeStyle = "#6e6e6e"
  for (let i = 0; i < size * 3; i++) {
    const x = Math.random() * size,
      y = Math.random() * size
    const len = 6 + Math.random() * 18,
      ang = (Math.random() - 0.5) * 0.9
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}
// a bit higher than the "max-perf" version
const baseNoise = smoothNoise(384)
const fiberBump = fibersTexture(384)

// small hash for stable "randomness" per bucket
const hash2 = (x: number, y: number) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// cache kraft materials by footprint bucket (tighter bucket for variety)
const kraftCache = new Map<string, THREE.MeshPhysicalMaterial>()
const bucket = (n: number, step = 4) => Math.max(step, Math.round(n / step) * step)

function makeKraftMaterial(boxW: number, boxD: number) {
  const bw = bucket(boxW),
    bd = bucket(boxD)
  const key = `${bw}x${bd}`
  const cached = kraftCache.get(key)
  if (cached) return cached

  const kraftHex = "#AE834D"

  const mapNoise = baseNoise.clone()
  const roughNoise = baseNoise.clone()
  const bumpTex = fiberBump.clone()

  const repeatX = Math.max(boxW / 18, 1)
  const repeatZ = Math.max(boxD / 18, 1)
  mapNoise.repeat.set(repeatX, repeatZ)
  roughNoise.repeat.set(repeatX, repeatZ)
  bumpTex.repeat.set(repeatX, repeatZ)

  // deterministic per-bucket "randomness" → more visual variety with cache
  const r = hash2(bw, bd)
  const rot = r > 0.5 ? 0 : Math.PI / 2
  const ox = hash2(bw + 13, bd + 7)
  const oz = hash2(bw + 5, bd + 29)
  ;[mapNoise, roughNoise, bumpTex].forEach((t) => {
    t.center.set(0.5, 0.5)
    t.rotation = rot
    t.offset.set(ox, oz)
    t.anisotropy = 4
  })

  // albedo
  const albedo = document.createElement("canvas")
  albedo.width = albedo.height = 384
  const ctx = albedo.getContext("2d")!
  ctx.fillStyle = kraftHex
  ctx.fillRect(0, 0, 384, 384)
  const noiseCanvas = mapNoise.image as HTMLCanvasElement
  ctx.globalCompositeOperation = "overlay"
  ctx.globalAlpha = 0.5
  ctx.drawImage(noiseCanvas, 0, 0, 384, 384)
  ctx.globalCompositeOperation = "soft-light"
  ctx.globalAlpha = 0.25
  ctx.drawImage(noiseCanvas, 0, 0, 384, 384)
  ctx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = 1

  const albedoTex = new THREE.CanvasTexture(albedo)
  albedoTex.colorSpace = THREE.SRGBColorSpace
  albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping
  albedoTex.repeat.copy(mapNoise.repeat)
  albedoTex.center.set(0.5, 0.5)
  albedoTex.rotation = rot
  albedoTex.offset.set(ox, oz)
  albedoTex.anisotropy = 4

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: albedoTex,
    metalness: 0,
    roughness: 0.42,
    roughnessMap: roughNoise,
    bumpMap: bumpTex,
    bumpScale: 0.035,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1,
    specularIntensity: 0.65,
    specularColor: new THREE.Color("#fff2d6"),
    envMapIntensity: 1.4,
    ior: 1.45,
  })

  kraftCache.set(key, mat)
  return mat
}

const matKraftEdge = new THREE.LineBasicMaterial({
  color: new THREE.Color("#80461B"), // brown, not black
  transparent: true,
  opacity: 0.08,
  depthWrite: false,
})

/* ---------- Tape material ---------- */
const matTape = new THREE.MeshPhysicalMaterial({
  color: "#EFDFA5",
  metalness: 0,
  roughness: 0.32,
  clearcoat: 0.25,
  clearcoatRoughness: 0.3,
  envMapIntensity: 0.9,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
})

/* ---------- Pallet wood ---------- */
const matWood = new THREE.MeshStandardMaterial({ color: "#B78946", roughness: 0.7, metalness: 0.05 })
const matWoodDark = new THREE.MeshStandardMaterial({ color: "#8F6A35", roughness: 0.7, metalness: 0.05 })

/* ---------- Label sprite ---------- */
function createLabelSprite(text: string) {
  const padX = 18,
    font = 34
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!
  canvas.height = 112
  canvas.width = Math.max(240, Math.round(text.length * (font * 0.62) + padX * 2))
  const r = 20,
    w = canvas.width,
    h = canvas.height
  ctx.fillStyle = "rgba(255,255,255,0.98)"
  ctx.strokeStyle = "rgba(31,41,55,0.28)"
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(w - r, 0)
  ctx.quadraticCurveTo(w, 0, w, r)
  ctx.lineTo(w, h - r)
  ctx.quadraticCurveTo(w, h, w - r, h)
  ctx.lineTo(r, h)
  ctx.quadraticCurveTo(0, h, 0, h - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = "#1f2937"
  ctx.font = `700 ${font}px Inter, Arial, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, w / 2, h / 2)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true })
  const s = new THREE.Sprite(mat)
  const aspect = h / w
  ;(s as any).userData.aspect = aspect
  s.scale.set(18, 18 * aspect, 1)
  return s
}

/* ---------- Improved camera fitting and scaling ---------- */
function getOptimalCameraDistance(sceneSize: THREE.Vector3, fov: number): number {
  const maxDim = Math.max(sceneSize.x, sceneSize.y, sceneSize.z)
  const fovRad = (fov * Math.PI) / 180
  const baseDist = maxDim / Math.tan(fovRad / 2)

  // Improved scaling based on scene characteristics
  const aspectRatio = Math.max(sceneSize.x, sceneSize.z) / Math.min(sceneSize.x, sceneSize.z)
  const heightRatio = sceneSize.y / Math.max(sceneSize.x, sceneSize.z)

  // Base multiplier for comfortable viewing
  let multiplier = 1.2

  // Adjust for aspect ratio - wider scenes need more distance
  if (aspectRatio > 1.5) {
    multiplier += (aspectRatio - 1.5) * 0.1
  }

  // Adjust for height - taller scenes need slightly more distance
  if (heightRatio > 0.8) {
    multiplier += (heightRatio - 0.8) * 0.2
  }

  // Clamp multiplier to reasonable bounds
  multiplier = Math.max(1.0, Math.min(1.8, multiplier))

  return baseDist * multiplier
}

function getScaleFactorForDistance(distance: number, baseSize: number): number {
  // Normalize distance relative to a reference size
  const normalizedDistance = distance / Math.max(baseSize, 50)

  // Create a smooth scaling curve
  const minScale = 0.3
  const maxScale = 1.2
  const midPoint = 2.0 // Distance where scale = 1.0

  let scale: number
  if (normalizedDistance < midPoint) {
    // Closer than midpoint - scale up smoothly
    const t = normalizedDistance / midPoint
    scale = minScale + (1.0 - minScale) * Math.pow(t, 0.7)
  } else {
    // Further than midpoint - scale down smoothly
    const t = Math.min((normalizedDistance - midPoint) / (4.0 - midPoint), 1.0)
    scale = 1.0 + (maxScale - 1.0) * Math.pow(t, 1.3)
  }

  return Math.max(minScale, Math.min(maxScale, scale))
}

/* ---------- Zoom limits calculation ---------- */
function getZoomLimits(baseRadius: number, sceneSize: THREE.Vector3) {
  const maxDim = Math.max(sceneSize.x, sceneSize.y, sceneSize.z)

  // Minimum zoom (closest) - don't get too close to avoid clipping
  const minRadius = Math.max(baseRadius * 0.4, maxDim * 0.8)

  // Maximum zoom (farthest) - don't get too far to maintain detail
  const maxRadius = Math.min(baseRadius * 2.5, maxDim * 8)

  return { minRadius, maxRadius }
}

/* ---------- Render-on-demand renderer (MSAA on, richer lights) ---------- */
class SceneRenderer {
  container: HTMLElement
  scene = new THREE.Scene()
  cam: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  raf: number | null = null
  resizeObserver: ResizeObserver | null = null

  theta = Math.PI * 0.22
  phi = Math.PI * 0.32
  radius = 160
  tTheta = this.theta
  tPhi = this.phi
  tRadius = this.radius
  target = new THREE.Vector3()

  dragging = false
  easing = false
  needsRender = true

  // Store scene characteristics for consistent scaling and zoom limits
  sceneSize = new THREE.Vector3()
  baseSceneSize = 100
  baseRadius = 160
  minRadius = 50
  maxRadius = 400

  constructor(el: HTMLElement) {
    this.container = el
    this.scene.background = new THREE.Color("#F7F8FA")
    this.cam = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 3000)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true, // quality ↑
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)) // quality ↑ but still capped
    this.renderer.setSize(el.clientWidth, el.clientHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.62
    this.renderer.shadowMap.enabled = false

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const env = new RoomEnvironment()
    const envRT = pmrem.fromScene(env, 0.04)
    this.scene.environment = envRT.texture

    el.appendChild(this.renderer.domElement)

    // a bit richer lighting for nicer speculars
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.18))
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8b5e34, 0.5)
    this.scene.add(hemi)
    const key = new THREE.DirectionalLight(0xffffff, 0.95)
    key.position.set(140, 200, 80)
    this.scene.add(key)
    const rim = new THREE.DirectionalLight(0xffffff, 0.8)
    rim.position.set(-120, 90, -140)
    this.scene.add(rim)
    const fill = new THREE.DirectionalLight(0xffffff, 0.45)
    fill.position.set(-60, 40, 120)
    this.scene.add(fill)

    this.bindControls()
    this.setupResizeObserver()
    this.loop()
  }

  dispose() {
    if (this.raf) cancelAnimationFrame(this.raf)
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    this.renderer.dispose()
    if (this.container.contains(this.renderer.domElement)) this.container.removeChild(this.renderer.domElement)
  }

  setupResizeObserver() {
    // Debounced resize handler to prevent infinite loops
    let resizeTimeout: NodeJS.Timeout | null = null

    this.resizeObserver = new ResizeObserver((entries) => {
      // Clear any pending resize
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }

      // Debounce the resize operation
      resizeTimeout = setTimeout(() => {
        try {
          const entry = entries[0]
          if (!entry) return

          const { width, height } = entry.contentRect

          // Only resize if dimensions actually changed and are valid
          if (width > 0 && height > 0) {
            const currentWidth = this.renderer.domElement.width / this.renderer.getPixelRatio()
            const currentHeight = this.renderer.domElement.height / this.renderer.getPixelRatio()

            if (Math.abs(width - currentWidth) > 1 || Math.abs(height - currentHeight) > 1) {
              this.cam.aspect = width / height
              this.cam.updateProjectionMatrix()
              this.renderer.setSize(width, height)
              this.invalidate()
            }
          }
        } catch (error) {
          // Silently handle ResizeObserver errors
          console.debug("ResizeObserver error handled:", error)
        }
      }, 16) // ~60fps debounce
    })

    this.resizeObserver.observe(this.container)
  }

  bindControls() {
    const el = this.renderer.domElement
    let lx = 0,
      ly = 0

    // Mouse drag controls
    el.addEventListener("mousedown", (e) => {
      this.dragging = true
      lx = e.clientX
      ly = e.clientY
      el.style.cursor = "grabbing"
    })

    el.addEventListener("mousemove", (e) => {
      if (!this.dragging) return
      const dx = e.clientX - lx,
        dy = e.clientY - ly
      lx = e.clientX
      ly = e.clientY
      this.tTheta += dx * 0.005
      this.tPhi = THREE.MathUtils.clamp(this.tPhi - dy * 0.005, 0.15, Math.PI - 0.15)
      this.easing = true
      this.invalidate()
    })

    const end = () => {
      this.dragging = false
      el.style.cursor = "grab"
      this.easing = true
      this.invalidate()
    }

    el.addEventListener("mouseup", end)
    el.addEventListener("mouseleave", end)

    // Zoom controls with limits
    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault()

        // Calculate zoom delta
        const delta = e.deltaY * 0.002
        const zoomFactor = Math.exp(delta)

        // Apply zoom with limits
        const newRadius = this.tRadius * zoomFactor
        this.tRadius = THREE.MathUtils.clamp(newRadius, this.minRadius, this.maxRadius)

        this.easing = true
        this.invalidate()
      },
      { passive: false },
    )

    el.style.cursor = "grab"
  }

  invalidate() {
    this.needsRender = true
    if (!this.raf) this.loop()
  }

  fitToBox(box: THREE.Box3) {
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    // Store scene characteristics
    this.sceneSize.copy(size)
    this.baseSceneSize = Math.max(size.x, size.y, size.z)

    this.target.copy(center)

    // Use improved camera distance calculation
    this.baseRadius = getOptimalCameraDistance(size, this.cam.fov)
    this.radius = this.baseRadius
    this.tRadius = this.baseRadius

    // Calculate zoom limits based on scene size
    const limits = getZoomLimits(this.baseRadius, size)
    this.minRadius = limits.minRadius
    this.maxRadius = limits.maxRadius

    // Set appropriate near/far planes
    this.cam.near = Math.max(0.1, this.baseSceneSize * 0.01)
    this.cam.far = Math.max(1000, this.baseSceneSize * 50)
    this.cam.updateProjectionMatrix()
    this.invalidate()
  }

  private loop = () => {
    const eps = 1e-3
    const prevTheta = this.theta,
      prevPhi = this.phi,
      prevRadius = this.radius

    // Smooth interpolation for all camera parameters
    this.theta += (this.tTheta - this.theta) * 0.12
    this.phi += (this.tPhi - this.phi) * 0.12
    this.radius += (this.tRadius - this.radius) * 0.12

    // Check if still easing
    if (
      Math.abs(this.theta - prevTheta) < eps &&
      Math.abs(this.phi - prevPhi) < eps &&
      Math.abs(this.radius - prevRadius) < eps
    ) {
      this.easing = false
    }

    // Update camera position
    this.cam.position.set(
      this.radius * Math.sin(this.phi) * Math.cos(this.theta) + this.target.x,
      this.radius * Math.cos(this.phi) + this.target.y,
      this.radius * Math.sin(this.phi) * Math.sin(this.theta) + this.target.z,
    )
    this.cam.lookAt(this.target)

    if (this.needsRender || this.dragging || this.easing) {
      this.renderer.render(this.scene, this.cam)
      this.needsRender = false
    }

    if (this.dragging || this.easing) {
      this.raf = requestAnimationFrame(this.loop)
    } else {
      this.raf = null
    }
  }
}

/* ---------- Pallet (instanced boards) ---------- */
function buildNicePallet(cfg: PalletConfig): THREE.Group {
  const g = new THREE.Group()
  const { width: W, depth: D, height: H } = cfg

  // Top deck boards (now running parallel to depth - 40" direction)
  const topBoardCount = 7
  const bottomBoardCount = 5
  const boardT = 0.6 // thickness
  const boardW = 3.75 // width of each board

  // Stringers (now running parallel to width - 48" direction for forklift access)
  const stringerW = 1.5
  const stringerH = H - boardT * 2
  const stringerT = 1.5 // thickness

  // Calculate spacing for top boards (across the 48" width)
  const gapTop = (W - topBoardCount * boardW) / (topBoardCount - 1)

  // Calculate spacing for bottom boards (across the 48" width)
  const gapBottom = (W - bottomBoardCount * boardW) / (bottomBoardCount - 1)

  // TOP DECK BOARDS - now running along 40" depth, spaced across 48" width
  const topGeo = new THREE.BoxGeometry(boardW, boardT, D)
  const top = new THREE.InstancedMesh(topGeo, matWood, topBoardCount)
  const m = new THREE.Matrix4()

  // Start from left edge and work right
  let xPos = -W / 2 + boardW / 2
  for (let i = 0; i < topBoardCount; i++) {
    m.makeTranslation(xPos, H / 2 - boardT / 2, 0)
    top.setMatrixAt(i, m)
    xPos += boardW + gapTop
  }
  g.add(top)

  // STRINGERS - now running along 48" width, positioned across 40" depth (forklift access)
  const stringerPositions = [-D / 2 + stringerW / 2 + 2, 0, D / 2 - stringerW / 2 - 2]
  stringerPositions.forEach((zPos) => {
    const geo = new THREE.BoxGeometry(W - 4, stringerH, stringerT)
    const mesh = new THREE.Mesh(geo, matWoodDark)
    mesh.position.set(0, 0, zPos) // Center vertically between top and bottom
    g.add(mesh)
  })

  // BOTTOM DECK BOARDS - now running along 40" depth, spaced across 48" width
  const botGeo = new THREE.BoxGeometry(boardW, boardT, D * 0.92) // slightly narrower
  const bot = new THREE.InstancedMesh(botGeo, matWood, bottomBoardCount)

  xPos = -W / 2 + boardW / 2
  for (let i = 0; i < bottomBoardCount; i++) {
    m.makeTranslation(xPos, -H / 2 + boardT / 2, 0)
    bot.setMatrixAt(i, m)
    xPos += boardW + gapBottom
  }
  g.add(bot)

  // Position the entire pallet so its bottom is at y=0
  g.position.y = H / 2

  return g
}

/* ---------- Dimensions ---------- */
function addDimensions(cfg: PalletConfig, calc: CalculationResult | null, camera: THREE.Camera) {
  const { width: W, depth: D, height: H } = cfg
  const totalH = calc?.totalHeight ?? H
  const group = new THREE.Group()
  ;(group as any).isDimGroup = true
  const color = 0x0f172a
  const makeArrowDim = (a: THREE.Vector3, b: THREE.Vector3, text: string, labelOffset: THREE.Vector3) => {
    const dim = new THREE.Group()
    const dir = new THREE.Vector3().subVectors(b, a)
    const len = dir.length()
    dir.normalize()
    const rodGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 18)
    const rodMat = new THREE.MeshBasicMaterial({ color, depthTest: true })
    const rod = new THREE.Mesh(rodGeo, rodMat)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    rod.quaternion.copy(quat)
    rod.position.copy(mid)
    rod.scale.set(0.14, len, 0.14)
    dim.add(rod)
    const coneGeo = new THREE.ConeGeometry(1, 2, 18)
    const headMat = new THREE.MeshBasicMaterial({ color, depthTest: true })
    const headA = new THREE.Mesh(coneGeo, headMat.clone())
    const headB = new THREE.Mesh(coneGeo, headMat.clone())
    headA.position.copy(a)
    headA.quaternion.copy(quat)
    headB.position.copy(b)
    headB.quaternion.copy(quat)
    headB.rotateX(Math.PI)
    dim.add(headA, headB)
    const label = createLabelSprite(text)
    const outward = labelOffset.clone().normalize().multiplyScalar(2)
    label.position.copy(mid.clone().add(labelOffset).add(outward))
    dim.add(label)
    dim.onBeforeRender = () => {
      const cam = camera as THREE.PerspectiveCamera
      const dist = cam.position.distanceTo(mid)
      const base = Math.max(W, D, totalH)
      const n = dist / base
      const k0 = THREE.MathUtils.smoothstep(n, 0.45, 1.6)
      const k = Math.pow(k0, 0.75)
      const rodMin = 0.035,
        rodMax = 0.14
      const headMin = 0.06,
        headMax = 0.22
      const labelMin = 5,
        labelMax = 16
      const rodThick = THREE.MathUtils.lerp(rodMin, rodMax, k)
      rod.scale.x = rodThick * 2.0
      rod.scale.z = rodThick * 2.0
      const headSize = THREE.MathUtils.lerp(headMin, headMax, k)
      headA.scale.setScalar(headSize * 1.8)
      headB.scale.setScalar(headSize * 1.8)
      const aspect = (label as any).userData.aspect as number
      const lbl = THREE.MathUtils.lerp(labelMin, labelMax, k)
      label.scale.set(lbl, lbl * aspect, 1)
      const push = 1.6 + rodThick * 6
      const offset = labelOffset.clone().normalize().multiplyScalar(push)
      label.position.copy(mid).add(labelOffset).add(offset)
    }
    group.add(dim)
  }
  const off = 6
  makeArrowDim(
    new THREE.Vector3(-W / 2, 0, D / 2 + off),
    new THREE.Vector3(W / 2, 0, D / 2 + off),
    `WIDTH: ${W}"`,
    new THREE.Vector3(0, 0, 3),
  )
  makeArrowDim(
    new THREE.Vector3(W / 2 + off, 0, -D / 2),
    new THREE.Vector3(W / 2 + off, 0, D / 2),
    `DEPTH: ${D}"`,
    new THREE.Vector3(3, 0, 0),
  )
  makeArrowDim(
    new THREE.Vector3(-W / 2 - off, -H, -D / 2 - off),
    new THREE.Vector3(-W / 2 - off, totalH - H, -D / 2 - off),
    `HEIGHT: ${totalH.toFixed(1)}"`,
    new THREE.Vector3(-2.5, 0, 0),
  )
  return group
}

/* ---------- Tape autosize ---------- */
function makeTapeAutosizer(camera: THREE.PerspectiveCamera, baseSize: number) {
  return (thicknessBase: number) => {
    const dist = camera.position.length()
    const n = dist / baseSize
    const k0 = THREE.MathUtils.smoothstep(n, 0.45, 1.6)
    return THREE.MathUtils.lerp(0.012, 0.05, Math.pow(k0, 0.75)) / thicknessBase
  }
}

/* ---------- Shared unit geometry + box geometry cache (slightly higher detail) ---------- */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)
const boxGeoCache = new Map<string, RoundedBoxGeometry>()
function getRoundedBox(w: number, h: number, d: number) {
  const r = (n: number) => Math.round(n * 1000) / 1000
  const minDim = Math.max(0.001, Math.min(w, h, d))
  const rMin = 0.01,
    rMax = 0.06
  const radius = Math.min(THREE.MathUtils.clamp(minDim * 0.004, rMin, rMax), minDim * 0.5 - 0.001)
  const key = `${r(w)}x${r(h)}x${r(d)}@${r(radius)}`
  let geo = boxGeoCache.get(key)
  if (!geo) {
    geo = new RoundedBoxGeometry(w, h, d, 3, radius) // segments 3 (sharper than 2, still reasonable)
    boxGeoCache.set(key, geo)
  }
  return geo
}

/* ---------- Boxes ---------- */
function addBoxesToScene(
  scene: THREE.Group<Object3DEventMap>,
  calc: CalculationResult,
  cfg: PalletConfig,
  viewMode: "full" | "layer",
  currentLayer: number,
  camera: PerspectiveCamera,
): THREE.Group {
  const layerH = new Map<number, number>()
  calc.placements.forEach((p) => layerH.set(p.layer, Math.max(layerH.get(p.layer) ?? 0, p.box.height)))

  const seamFor = (bw: number, bd: number) => THREE.MathUtils.clamp(Math.min(bw, bd) * 0.004, 0.01, 0.1)

  const group = new THREE.Group()
  const placements = calc.placements.slice().sort((a, b) => a.layer - b.layer)

  const baseSceneSize = Math.max(cfg.width, cfg.depth, calc.totalHeight ?? cfg.height)
  const autosize = makeTapeAutosizer(camera, baseSceneSize)

  placements.forEach((p) => {
    const { rotation, x, z, layer, box } = p
    const bw = rotation === 90 ? box.width : box.length
    const bd = rotation === 90 ? box.length : box.width
    const bh = box.height

    let y = cfg.height // Start from pallet surface height
    for (let i = 0; i < layer; i++) y += layerH.get(i) ?? 0
    y += bh / 2

    const seam = seamFor(bw, bd)
    const w = Math.max(bw - seam, 0)
    const h = bh
    const d = Math.max(bd - seam, 0)

    const geo = getRoundedBox(w, h, d)
    const mat = makeKraftMaterial(bw, bd)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    group.add(mesh)

    // edges ON for all boxes (looks nicer), dim non-active layers
    const edges = new THREE.EdgesGeometry(geo)
    const lineMat = matKraftEdge.clone()
    if (viewMode === "layer" && layer !== currentLayer) {
      lineMat.color = new THREE.Color("#6b7280")
      lineMat.opacity = 0.25
    }
    const line = new THREE.LineSegments(edges, lineMat)
    line.position.copy(mesh.position)
    group.add(line)

    // ----- Tape (copied exactly from reference) -----
    const stripeW = THREE.MathUtils.clamp(Math.min(bw, bd) * 0.085, 0.14, 0.9)
    const wrap = THREE.MathUtils.clamp(bh * 0.32, 0.6, Math.max(0.6, bh * 0.55))
    const baseT = 0.02

    const makeTapeMesh = () => new THREE.Mesh(UNIT_BOX, matTape)

    if (bw >= bd) {
      const top = makeTapeMesh()
      top.scale.set((bw - seam) * 0.97, baseT, stripeW)
      const baseY = y + bh / 2 + 0.004
      top.position.set(x, baseY + baseT / 2, z)
      top.onBeforeRender = () => {
        const m = autosize(baseT)
        top.scale.y = baseT * m
        top.position.y = baseY + (baseT * m) / 2
      }
      group.add(top)

      const left = makeTapeMesh()
      const right = makeTapeMesh()
      left.scale.set(baseT, wrap, stripeW)
      right.scale.set(baseT, wrap, stripeW)
      left.position.set(x - (bw - seam) / 2 + baseT / 2, y + bh / 2 - wrap / 2, z)
      right.position.set(x + (bw - seam) / 2 - baseT / 2, y + bh / 2 - wrap / 2, z)
      const updateLR = (m: number) => {
        const t = baseT * m
        left.scale.x = right.scale.x = t
        left.position.x = x - (bw - seam) / 2 + t / 2
        right.position.x = x + (bw - seam) / 2 - t / 2
      }
      left.onBeforeRender = right.onBeforeRender = () => updateLR(autosize(baseT))
      group.add(left, right)

      if (viewMode === "layer" && layer !== currentLayer) top.visible = left.visible = right.visible = false
    } else {
      const top = makeTapeMesh()
      top.scale.set(stripeW, baseT, (bd - seam) * 0.97)
      const baseY = y + bh / 2 + 0.004
      top.position.set(x, baseY + baseT / 2, z)
      top.onBeforeRender = () => {
        const m = autosize(baseT)
        top.scale.y = baseT * m
        top.position.y = baseY + (baseT * m) / 2
      }
      group.add(top)

      const front = makeTapeMesh()
      const back = makeTapeMesh()
      front.scale.set(stripeW, wrap, baseT)
      back.scale.set(stripeW, wrap, baseT)
      front.position.set(x, y + bh / 2 - wrap / 2, z + (bd - seam) / 2 - baseT / 2)
      back.position.set(x, y + bh / 2 - wrap / 2, z - (bd - seam) / 2 + baseT / 2)
      const updateFB = (m: number) => {
        const t = baseT * m
        front.scale.z = back.scale.z = t
        front.position.z = z + (bd - seam) / 2 - t / 2
        back.position.z = z - (bd - seam) / 2 + t / 2
      }
      front.onBeforeRender = back.onBeforeRender = () => updateFB(autosize(baseT))
      group.add(front, back)

      if (viewMode === "layer" && layer !== currentLayer) top.visible = front.visible = back.visible = false
    }

    if (viewMode === "layer" && layer !== currentLayer) {
      mesh.visible = false
    }
  })

  scene.add(group)
  return group
}

/* ---------- Disposer ---------- */
function disposeDeep(obj: THREE.Object3D) {
  obj.traverse((o: any) => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach((m: { dispose: () => void }) => {
        for (const k in m) {
          const v = (m as any)[k]
          if (v && v.isTexture) v.dispose()
        }
        m.dispose()
      })
    }
  })
}

/* ---------- Main component ---------- */
export default function ThreeDVisualization({
  calculation,
  palletConfig,
  viewMode,
  currentLayer,
  isThumbnail = false,
  static3D = false, // 👈 NEW
}: Props & { static3D?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<any>(null) // SceneRenderer | StillRenderer
  const contentRef = useRef<THREE.Group | null>(null)
  const dimsRef = useRef<THREE.Group | null>(null)

  // --- Tiny, single-frame renderer for 3D thumbnails (no controls) ---
  class StillRenderer {
    container: HTMLElement
    scene = new THREE.Scene()
    cam: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    target = new THREE.Vector3()

    constructor(el: HTMLElement) {
      this.container = el
      this.cam = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 3000)

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      })
      // a little lighter than the interactive renderer
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
      this.renderer.setSize(el.clientWidth, el.clientHeight)
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping
      this.renderer.toneMappingExposure = 0.62
      this.renderer.shadowMap.enabled = false
      this.scene.background = new THREE.Color("#F7F8FA")

      const pmrem = new THREE.PMREMGenerator(this.renderer)
      const env = new RoomEnvironment()
      const envRT = pmrem.fromScene(env, 0.04)
      this.scene.environment = envRT.texture

      // simple three-point-ish lighting
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.18))
      const hemi = new THREE.HemisphereLight(0xffffff, 0x8b5e34, 0.5)
      const key = new THREE.DirectionalLight(0xffffff, 0.95)
      const rim = new THREE.DirectionalLight(0xffffff, 0.8)
      const fill = new THREE.DirectionalLight(0xffffff, 0.45)
      key.position.set(140, 200, 80)
      rim.position.set(-120, 90, -140)
      fill.position.set(-60, 40, 120)
      this.scene.add(hemi, key, rim, fill)

      el.appendChild(this.renderer.domElement)

      // keep sharp on card resizes
      new ResizeObserver(() => {
        const w = this.container.clientWidth
        const h = this.container.clientHeight
        this.cam.aspect = Math.max(1e-6, w / h)
        this.cam.updateProjectionMatrix()
        this.renderer.setSize(w, h)
        this.renderOnce()
      }).observe(el)
    }

    fitToBox(box: THREE.Box3) {
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(center)
      this.target.copy(center)

      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = (this.cam.fov * Math.PI) / 180
      const dist = (maxDim * 1.0) / Math.tan(fov / 2)

      // pleasant angle for thumbnails
      const theta = Math.PI * 0.22
      const phi = Math.PI * 0.32
      const radius = dist * 0.9

      this.cam.near = Math.max(0.1, maxDim * 0.01)
      this.cam.far = Math.max(1000, maxDim * 40)
      this.cam.updateProjectionMatrix()

      this.cam.position.set(
        radius * Math.sin(phi) * Math.cos(theta) + this.target.x,
        radius * Math.cos(phi) + this.target.y,
        radius * Math.sin(phi) * Math.sin(theta) + this.target.z,
      )
      this.cam.lookAt(this.target)
    }

    renderOnce() {
      this.renderer.render(this.scene, this.cam)
    }

    dispose() {
      this.renderer.dispose()
      if (this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement)
      }
    }
  }

  // --- Interactive renderer lifecycle (unchanged) ---
  useEffect(() => {
    if (isThumbnail) return // handled below
    const el = mountRef.current
    if (!el) return
    rendererRef.current?.dispose?.()
    rendererRef.current = new SceneRenderer(el)
    return () => rendererRef.current?.dispose?.()
  }, [isThumbnail])

  // --- Build content ---
  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // 3D thumbnail path
    if (isThumbnail && static3D) {
      const r: StillRenderer = new StillRenderer(el)
      rendererRef.current?.dispose?.()
      rendererRef.current = r

      // clear old groups if any
      if (contentRef.current) disposeDeep(contentRef.current)
      if (dimsRef.current) disposeDeep(dimsRef.current)
      contentRef.current = null
      dimsRef.current = null

      const content = new THREE.Group()
      contentRef.current = content
      r.scene.add(content)

      const pallet = buildNicePallet(palletConfig)
      content.add(pallet)

      if (calculation?.placements?.length) {
        const boxes = addBoxesToScene(
          content,
          calculation,
          palletConfig,
          viewMode,
          currentLayer,
          r.cam as THREE.PerspectiveCamera,
        )
        content.add(boxes)
      }

      const box = new THREE.Box3().setFromObject(content)
      r.fitToBox(box)
      r.renderOnce()
      return () => r.dispose()
    }

    // interactive path (original)
    if (isThumbnail) return
    const r = rendererRef.current as SceneRenderer
    if (!r) return

    if (contentRef.current) {
      r.scene.remove(contentRef.current)
      disposeDeep(contentRef.current)
      contentRef.current = null
    }
    if (dimsRef.current) {
      r.scene.remove(dimsRef.current)
      disposeDeep(dimsRef.current)
      dimsRef.current = null
    }

    const content = new THREE.Group()
    contentRef.current = content
    r.scene.add(content)

    const pallet = buildNicePallet(palletConfig)
    content.add(pallet)

    if (calculation?.placements?.length) {
      const boxes = addBoxesToScene(
        content,
        calculation,
        palletConfig,
        viewMode,
        currentLayer,
        r.cam as THREE.PerspectiveCamera,
      )
      content.add(boxes)
    }

    const box = new THREE.Box3().setFromObject(content)
    r.fitToBox(box)

    // only show dimensions in interactive mode
    const dims = addDimensions(palletConfig, calculation, r.cam)
    dimsRef.current = dims
    r.scene.add(dims)

    r.invalidate()
  }, [calculation, palletConfig, viewMode, currentLayer, isThumbnail, static3D])

  // ---- Render roots ----
  if (isThumbnail && !static3D) {
    // keep your old fast 2D fallback if you ever want it
    return (
      <div className="w-full h-full min-h-0">
        <ThumbnailVisualization calculation={calculation} palletConfig={palletConfig} />
      </div>
    )
  }

  // container chrome:
  // - thumbnail 3D: clean, no border/min-height so it fills the card preview box
  // - interactive: keep the original frame
  return (
    <div
      ref={mountRef}
      className={
        isThumbnail && static3D
          ? "w-full h-full"
          : "w-full h-full min-h-[250px] lg:min-h-[600px] bg-[#F7F8FA] rounded-lg overflow-hidden border border-slate-200"
      }
    />
  )
}
