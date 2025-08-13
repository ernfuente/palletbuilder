interface StorageData {
  [key: string]: any
}

interface SavedCalculation {
  id: string
  name: string
  timestamp: number
  boxes: any[]
  pallet: any
  result: any
}

class StorageManager {
  private cache: Map<string, any> = new Map()

  async get<T>(key: string): Promise<T | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }

    try {
      if (typeof window !== 'undefined') {
        const item = localStorage.getItem(key)
        if (item) {
          const parsed = JSON.parse(item)
          this.cache.set(key, parsed)
          return parsed
        }
      }
    } catch (error) {
      console.error('Error reading from storage:', error)
    }

    return null
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value))
        this.cache.set(key, value)
      }
    } catch (error) {
      console.error('Error writing to storage:', error)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
        this.cache.delete(key)
      }
    } catch (error) {
      console.error('Error removing from storage:', error)
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const storage = new StorageManager()

// Calculation-specific storage functions
const CALCULATIONS_KEY = 'pallet_calculations'

export function saveCalculation(data: {
  name: string
  boxes: any[]
  pallet: any
  result: any
}): SavedCalculation {
  const calculation: SavedCalculation = {
    id: Date.now().toString(),
    name: data.name,
    timestamp: Date.now(),
    boxes: data.boxes,
    pallet: data.pallet,
    result: data.result
  }

  const existing = getCalculationHistory()
  const updated = [calculation, ...existing.filter(c => c.id !== calculation.id)]
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(CALCULATIONS_KEY, JSON.stringify(updated))
  }

  return calculation
}

export function loadCalculation(id: string): SavedCalculation | null {
  const calculations = getCalculationHistory()
  return calculations.find(c => c.id === id) || null
}

export function getCalculationHistory(): SavedCalculation[] {
  try {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(CALCULATIONS_KEY)
      if (item) {
        return JSON.parse(item)
      }
    }
  } catch (error) {
    console.error('Error loading calculation history:', error)
  }
  return []
}

export function deleteCalculation(id: string): void {
  const existing = getCalculationHistory()
  const updated = existing.filter(c => c.id !== id)
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(CALCULATIONS_KEY, JSON.stringify(updated))
  }
}
