// Optimized Three.js imports and utilities
import type { Object3D, Material, Geometry, BufferGeometry, Texture } from "three"

// Dispose Three.js objects properly to prevent memory leaks
export function disposeThreeObject(obj: Object3D) {
  if (!obj) return

  obj.traverse((child) => {
    // Dispose geometries
    if ((child as any).geometry) {
      const geometry = (child as any).geometry as BufferGeometry | Geometry
      if (geometry.dispose) {
        geometry.dispose()
      }
    }

    // Dispose materials
    if ((child as any).material) {
      const materials = Array.isArray((child as any).material) ? (child as any).material : [(child as any).material]

      materials.forEach((material: Material) => {
        if (material.dispose) {
          material.dispose()
        }

        // Dispose textures
        Object.values(material).forEach((value) => {
          if (value && typeof value === "object" && "dispose" in value) {
            ;(value as Texture).dispose()
          }
        })
      })
    }
  })

  // Remove from parent
  if (obj.parent) {
    obj.parent.remove(obj)
  }
}

// Three.js resource pool for reusing objects
class ThreeResourcePool {
  private geometryPool = new Map<string, BufferGeometry[]>()
  private materialPool = new Map<string, Material[]>()

  getGeometry(key: string, factory: () => BufferGeometry): BufferGeometry {
    const pool = this.geometryPool.get(key) || []

    if (pool.length > 0) {
      return pool.pop()!
    }

    return factory()
  }

  returnGeometry(key: string, geometry: BufferGeometry) {
    const pool = this.geometryPool.get(key) || []
    if (pool.length < 10) {
      // Limit pool size
      pool.push(geometry)
      this.geometryPool.set(key, pool)
    } else {
      geometry.dispose()
    }
  }

  getMaterial(key: string, factory: () => Material): Material {
    const pool = this.materialPool.get(key) || []

    if (pool.length > 0) {
      return pool.pop()!
    }

    return factory()
  }

  returnMaterial(key: string, material: Material) {
    const pool = this.materialPool.get(key) || []
    if (pool.length < 10) {
      // Limit pool size
      pool.push(material)
      this.materialPool.set(key, pool)
    } else {
      material.dispose()
    }
  }

  dispose() {
    this.geometryPool.forEach((pool) => {
      pool.forEach((geometry) => geometry.dispose())
    })
    this.materialPool.forEach((pool) => {
      pool.forEach((material) => material.dispose())
    })
    this.geometryPool.clear()
    this.materialPool.clear()
  }
}

export const threeResourcePool = new ThreeResourcePool()
