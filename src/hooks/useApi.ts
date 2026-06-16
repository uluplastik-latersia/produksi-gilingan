import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { get, set } from 'idb-keyval'

export type Category = {
  id: number
  name: string
  moduleType: 'kering' | 'kecil' | 'luar' | 'basah'
}

export type InventoryItem = {
  id: number
  categoryId: number
  categoryName: string
  moduleType: 'kering' | 'kecil' | 'luar' | 'basah'
  stockType: 'raw' | 'processed'
  currentStock: number
  updatedAt: number
}

const API_BASE = '/api'
const QUEUE_KEY = 'offline-transaction-queue'

export function useApi() {
  const [categories, setCategories] = useState<Category[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)

  // Track online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineQueue()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`)
      const json = await res.json()
      if (json.success) {
        setCategories(json.data)
        await set('cached-categories', json.data)
      }
    } catch (e) {
      console.warn('Failed to fetch categories from network, using cache')
      const cached = await get('cached-categories')
      if (cached) setCategories(cached)
    }
  }, [])

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory`)
      const json = await res.json()
      if (json.success) {
        setInventory(json.data)
        await set('cached-inventory', json.data)
      }
    } catch (e) {
      console.warn('Failed to fetch inventory from network, using cache')
      const cached = await get('cached-inventory')
      if (cached) setInventory(cached)
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchCategories(), fetchInventory()])
    // Attempt sync on load if online
    if (navigator.onLine) {
      await syncOfflineQueue()
    }
    setLoading(false)
  }, [fetchCategories, fetchInventory])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const syncOfflineQueue = async () => {
    if (syncing) return
    setSyncing(true)
    
    try {
      const queue: any[] = await get(QUEUE_KEY) || []
      if (queue.length === 0) {
        setSyncing(false)
        return
      }

      toast.info(`Menyinkronkan ${queue.length} data tertunda...`)
      let successCount = 0
      let failedQueue = []

      for (const item of queue) {
        try {
          const res = await fetch(item.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          })
          const json = await res.json()
          if (json.success) {
            successCount++
          } else {
            failedQueue.push(item) // Keep failed requests (e.g. validation error) to avoid dropping
          }
        } catch (e) {
          failedQueue.push(item) // Network failed again
        }
      }

      await set(QUEUE_KEY, failedQueue)
      
      if (successCount > 0) {
        toast.success(`${successCount} data berhasil disinkronkan! ☁️`)
        await fetchInventory() // Refresh real inventory from server
      }
      
      if (failedQueue.length > 0) {
        toast.error(`${failedQueue.length} data gagal disinkronkan.`)
      }

    } catch (e) {
      console.error('Error syncing queue', e)
    } finally {
      setSyncing(false)
    }
  }

  const enqueueTransaction = async (url: string, data: any, updateOptimisticInventory: (inv: InventoryItem[]) => InventoryItem[]) => {
    const queue: any[] = await get(QUEUE_KEY) || []
    queue.push({ url, data, timestamp: Date.now() })
    await set(QUEUE_KEY, queue)
    
    // Optimistic UI Update
    setInventory(prev => {
      const newInv = updateOptimisticInventory([...prev])
      set('cached-inventory', newInv) // update cache too
      return newInv
    })
    
    toast.success('Sinyal terputus. Data tersimpan di HP (Menunggu Sinkronisasi) 💾', { duration: 4000 })
  }

  const submitTransactionIn = async (data: { categoryId: number; stockType: string; weight: number; notes?: string }) => {
    if (!isOnline) {
      await enqueueTransaction(`${API_BASE}/transactions/in`, data, (inv) => {
        const item = inv.find(i => i.categoryId === data.categoryId && i.stockType === data.stockType)
        if (item) item.currentStock += data.weight
        return inv
      })
      return true
    }

    try {
      const res = await fetch(`${API_BASE}/transactions/in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Data berhasil disimpan!')
        await fetchInventory()
        return true
      } else {
        toast.error(`Error: ${json.error}`)
        return false
      }
    } catch (e: any) {
      // Fallback to queue if it failed due to sudden disconnect
      await enqueueTransaction(`${API_BASE}/transactions/in`, data, (inv) => {
        const item = inv.find(i => i.categoryId === data.categoryId && i.stockType === data.stockType)
        if (item) item.currentStock += data.weight
        return inv
      })
      return true
    }
  }

  const submitTransactionProduction = async (data: { categoryId: number; rawWeight: number; processedWeight: number; notes?: string }) => {
    if (!isOnline) {
      await enqueueTransaction(`${API_BASE}/transactions/production`, data, (inv) => {
        const rawItem = inv.find(i => i.categoryId === data.categoryId && i.stockType === 'raw')
        const processedItem = inv.find(i => i.categoryId === data.categoryId && i.stockType === 'processed')
        if (rawItem) rawItem.currentStock = Math.max(0, rawItem.currentStock - data.rawWeight)
        if (processedItem) processedItem.currentStock += data.processedWeight
        return inv
      })
      return true
    }

    try {
      const res = await fetch(`${API_BASE}/transactions/production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Data produksi berhasil disimpan!')
        await fetchInventory()
        return true
      } else {
        toast.error(`Error: ${json.error}`)
        return false
      }
    } catch (e: any) {
      await enqueueTransaction(`${API_BASE}/transactions/production`, data, (inv) => {
        const rawItem = inv.find(i => i.categoryId === data.categoryId && i.stockType === 'raw')
        const processedItem = inv.find(i => i.categoryId === data.categoryId && i.stockType === 'processed')
        if (rawItem) rawItem.currentStock = Math.max(0, rawItem.currentStock - data.rawWeight)
        if (processedItem) processedItem.currentStock += data.processedWeight
        return inv
      })
      return true
    }
  }

  const submitTransactionSampah = async (data: { categoryId: number; weight: number; notes?: string }) => {
    if (!isOnline) {
      await enqueueTransaction(`${API_BASE}/transactions/sampah`, data, (inv) => {
        const item = inv.find(i => i.categoryId === data.categoryId && i.stockType === 'raw')
        if (item) item.currentStock = Math.max(0, item.currentStock - data.weight)
        return inv
      })
      return true
    }

    try {
      const res = await fetch(`${API_BASE}/transactions/sampah`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Data sampah berhasil disimpan!')
        await fetchInventory()
        return true
      } else {
        toast.error(`Error: ${json.error}`)
        return false
      }
    } catch (e: any) {
      await enqueueTransaction(`${API_BASE}/transactions/sampah`, data, (inv) => {
        const item = inv.find(i => i.categoryId === data.categoryId && i.stockType === 'raw')
        if (item) item.currentStock = Math.max(0, item.currentStock - data.weight)
        return inv
      })
      return true
    }
  }

  const submitTransactionOplosan = async (data: { batchName: string; notes?: string; items: { categoryId: number; weight: number }[] }) => {
    if (!isOnline) {
      await enqueueTransaction(`${API_BASE}/transactions/oplosan`, data, (inv) => {
        data.items.forEach(itemInput => {
          const rawItem = inv.find(i => i.categoryId === itemInput.categoryId && i.stockType === 'raw')
          if (rawItem) rawItem.currentStock = Math.max(0, rawItem.currentStock - itemInput.weight)
        })
        return inv
      })
      return true
    }

    try {
      const res = await fetch(`${API_BASE}/transactions/oplosan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Data oplosan berhasil disimpan!')
        await fetchInventory()
        return true
      } else {
        toast.error(`Error: ${json.error}`)
        return false
      }
    } catch (e: any) {
      await enqueueTransaction(`${API_BASE}/transactions/oplosan`, data, (inv) => {
        data.items.forEach(itemInput => {
          const rawItem = inv.find(i => i.categoryId === itemInput.categoryId && i.stockType === 'raw')
          if (rawItem) rawItem.currentStock = Math.max(0, rawItem.currentStock - itemInput.weight)
        })
        return inv
      })
      return true
    }
  }

  const fetchTransactions = async (moduleType?: string, startDate?: Date, endDate?: Date) => {
    try {
      let url = `${API_BASE}/transactions`
      const params = new URLSearchParams()
      if (moduleType) params.append('moduleType', moduleType)
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())
      
      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }
      
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) return json.data
      return []
    } catch (e) {
      console.error(e)
      return []
    }
  }

  const fetchMonthlySummary = async (year: number, month: number, startDate?: Date, endDate?: Date) => {
    try {
      let url = `${API_BASE}/transactions/summary`
      if (startDate && endDate) {
        url += `?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
      } else {
        url += `?year=${year}&month=${month}`
      }
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) return json.data
      return []
    } catch (e) {
      console.error(e)
      return []
    }
  }

  return {
    categories,
    inventory,
    loading,
    isOnline,
    refresh: fetchInventory,
    submitTransactionIn,
    submitTransactionProduction,
    submitTransactionOplosan,
    submitTransactionSampah,
    fetchTransactions,
    fetchMonthlySummary,
  }
}
