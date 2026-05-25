import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

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

export function useApi() {
  const [categories, setCategories] = useState<Category[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`)
      const json = await res.json()
      if (json.success) setCategories(json.data)
    } catch (e) {
      console.error('Failed to fetch categories', e)
    }
  }, [])

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory`)
      const json = await res.json()
      if (json.success) setInventory(json.data)
    } catch (e) {
      console.error('Failed to fetch inventory', e)
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchCategories(), fetchInventory()])
    setLoading(false)
  }, [fetchCategories, fetchInventory])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const submitTransactionIn = async (data: { categoryId: number; stockType: string; weight: number; notes?: string }) => {
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
      toast.error(`Koneksi error: ${e.message}`)
      return false
    }
  }

  const submitTransactionProduction = async (data: { categoryId: number; rawWeight: number; processedWeight: number; notes?: string }) => {
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
      toast.error(`Koneksi error: ${e.message}`)
      return false
    }
  }

  const submitTransactionOplosan = async (data: { batchName: string; notes?: string; items: { categoryId: number; weight: number }[] }) => {
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
      toast.error(`Koneksi error: ${e.message}`)
      return false
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
    refresh: fetchInventory,
    submitTransactionIn,
    submitTransactionProduction,
    submitTransactionOplosan,
    fetchTransactions,
    fetchMonthlySummary,
  }
}
