import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


import { useApi } from '@/hooks/useApi'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { Plus, Trash2, Combine, ScrollText } from 'lucide-react'

type MixItem = {
  id: string
  categoryId: string
  weight: string
}

export function OplosanPage() {
  const { categories, inventory, loading, submitTransactionOplosan } = useApi()
  const navigate = useNavigate()
  
  // Only show processed items that actually have stock to mix
  const availableInventory = useMemo(() => {
    return inventory.filter(i => i.stockType === 'processed' && i.currentStock > 0)
  }, [inventory])

  // Form State
  const [batchName, setBatchName] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<MixItem[]>([{ id: '1', categoryId: '', weight: '' }])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleAddItem = () => {
    setItems([...items, { id: Math.random().toString(), categoryId: '', weight: '' }])
  }

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof MixItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const totalWeight = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0)
  }, [items])

  const isFormValid = batchName.trim() !== '' && 
    items.every(item => item.categoryId && parseFloat(item.weight) > 0) &&
    items.length > 0

  const handleSubmit = async () => {
    const submitItems = items.map(item => ({
      categoryId: parseInt(item.categoryId),
      weight: parseFloat(item.weight)
    }))

    const success = await submitTransactionOplosan({
      batchName,
      notes,
      items: submitItems
    })

    if (success) {
      setBatchName('')
      setNotes('')
      setItems([{ id: '1', categoryId: '', weight: '' }])
      setConfirmOpen(false)
    }
  }

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === parseInt(id))?.name || 'Unknown'
  }

  const getAvailableStock = (categoryId: string) => {
    if (!categoryId) return 0
    return availableInventory.find(i => i.categoryId === parseInt(categoryId))?.currentStock || 0
  }

  if (loading) {
    return <div className="p-8 text-center">Loading data...</div>
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Oplosan (Campur)</h1>
        <p className="text-muted-foreground">Campur berbagai hasil produksi menjadi satu batch.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Oplosan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="batch-name" className="text-base">Nama / Kode Batch</Label>
            <Input 
              id="batch-name" 
              placeholder="Contoh: Oplosan 20-Mei-26 A"
              className="h-12 text-lg"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />
          </div>


          <div className="pt-4 border-t border-dashed">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Bahan Campuran</h3>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                const stock = getAvailableStock(item.categoryId)
                const isOverStock = item.weight ? parseFloat(item.weight) > stock : false

                return (
                  <div key={item.id} className="p-4 bg-slate-50 border rounded-lg space-y-4 relative">
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    {items.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-base">Pilih Bahan (Stok Tersedia)</Label>
                        <Select value={item.categoryId} onValueChange={(val) => val && updateItem(item.id, 'categoryId', val)}>
                          <SelectTrigger className="h-12 text-base bg-white w-full">
                            <SelectValue placeholder="Pilih bahan...">
                              {item.categoryId ? availableInventory.find(inv => inv.categoryId.toString() === item.categoryId)?.categoryName : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="w-[85vw] sm:w-[400px]">
                            {availableInventory.length === 0 ? (
                              <SelectItem value="none" disabled>Tidak ada stok bersih tersedia</SelectItem>
                            ) : (
                              availableInventory.map(inv => (
                                <SelectItem key={inv.categoryId} value={inv.categoryId.toString()} className="h-10 text-base">
                                  {inv.categoryName} ({inv.currentStock} kg)
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base">Berat Dipakai (kg)</Label>
                        <Input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="0"
                          className={`h-12 text-xl font-numeric bg-white ${isOverStock ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          value={item.weight}
                          onChange={(e) => updateItem(item.id, 'weight', e.target.value.replace(/[^0-9.]/g, ''))}
                        />
                        {isOverStock && <p className="text-sm text-red-500 font-medium">Melebihi stok tersedia!</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
              
              <Button variant="outline" size="sm" onClick={handleAddItem} className="h-12 w-full mt-4 bg-white border-dashed text-teal-700 hover:text-teal-800 hover:bg-teal-50">
                <Plus className="h-5 w-5 mr-2" />
                Tambah Bahan Lainnya
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-between items-end">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Berat Oplosan</p>
              <p className="text-4xl font-numeric font-bold text-teal-800">{totalWeight.toLocaleString('id-ID')} <span className="text-lg font-sans font-normal text-muted-foreground">kg</span></p>
            </div>
            <Button 
              className="h-14 px-8 text-lg bg-teal-700 hover:bg-teal-800 touch-target"
              disabled={!isFormValid || items.some(item => parseFloat(item.weight) > getAvailableStock(item.categoryId))}
              onClick={() => setConfirmOpen(true)}
            >
              <Combine className="mr-2 h-5 w-5" />
              Proses Oplosan
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Proses Oplosan</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Anda akan membuat batch <strong>{batchName}</strong> dengan total <strong>{totalWeight} kg</strong>.
              <br/><br/>
              Bahan yang digunakan:
              <ul className="list-disc pl-5 mt-2 space-y-1 text-foreground">
                {items.map(item => (
                  <li key={item.id}>{getCategoryName(item.categoryId)}: <span className="font-numeric font-bold">{item.weight} kg</span></li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 text-base">Batal</AlertDialogCancel>
            <AlertDialogAction className="h-12 text-base bg-teal-700" onClick={handleSubmit}>Ya, Proses Sekarang</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Riwayat Shortcut */}
      <div className="mt-8">
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-100 text-teal-700 rounded-full">
                <ScrollText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Riwayat Oplosan</h3>
                <p className="text-sm text-muted-foreground">Lihat riwayat lengkap transaksi oplosan dan filter berdasarkan tanggal.</p>
              </div>
            </div>
            <Button onClick={() => navigate(`/riwayat/oplosan`)} className="bg-teal-700 hover:bg-teal-800 w-full sm:w-auto">
              Buka Riwayat
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
