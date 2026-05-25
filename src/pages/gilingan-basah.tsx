import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

import { Package, ScrollText } from 'lucide-react'

export function GilinganBasahPage() {
  const { categories, inventory, loading, submitTransactionIn } = useApi()
  const navigate = useNavigate()
  
  const moduleCategories = useMemo(() => {
    return categories.filter(c => c.moduleType === 'basah')
  }, [categories])

  const moduleInventory = useMemo(() => {
    return inventory.filter(i => i.moduleType === 'basah')
  }, [inventory])

  // Form State: Bahan Masuk
  const [inCategoryId, setInCategoryId] = useState('')
  const [inWeight, setInWeight] = useState('')
  const [inConfirmOpen, setInConfirmOpen] = useState(false)

  const handleBahanMasuk = async () => {
    const success = await submitTransactionIn({
      categoryId: parseInt(inCategoryId),
      stockType: 'processed', // Important: Gilingan basah is already processed!
      weight: parseFloat(inWeight),
    })
    if (success) {
      setInCategoryId('')
      setInWeight('')
      setInConfirmOpen(false)
    }
  }

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === parseInt(id))?.name || 'Unknown'
  }

  if (loading) {
    return <div className="p-8 text-center">Loading data...</div>
  }

  const hasInventory = moduleCategories.some(cat => {
    const raw = moduleInventory.find(i => i.categoryId === cat.id && i.stockType === 'processed')?.currentStock || 0
    return raw > 0
  })

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Gilingan Basah</h1>
        <p className="text-muted-foreground">Kelola barang jadi yang masuk dari proses gilingan basah.</p>
      </div>

      {/* Highlight Data Stok - Format Minimalis */}
      <Card className="bg-white border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50 px-6 py-4 border-b">
          <CardTitle className="text-xl flex items-center"><Package className="mr-2 h-5 w-5" /> Detail Data Stok</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-800 px-6">JENIS</TableHead>
                  <TableHead className="font-semibold text-slate-800 px-6 text-right">SISA HASIL PRODUKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moduleCategories.map(cat => {
                  const raw = moduleInventory.find(i => i.categoryId === cat.id && i.stockType === 'processed')?.currentStock || 0
                  
                  if (raw === 0) return null
                  
                  return (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium text-base text-slate-800 px-6">{cat.name}</TableCell>
                      <TableCell className="text-right font-numeric text-lg font-bold text-teal-700 px-6">
                        {raw.toLocaleString('id-ID')} <span className="text-xs font-normal text-muted-foreground">kg</span>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!hasInventory && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      Data stok kosong. Belum ada barang hasil produksi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="masuk" className="w-full">
        <TabsList className="grid w-full grid-cols-1 h-14 bg-slate-100">
          <TabsTrigger value="masuk" className="text-base h-full touch-target">Input Barang Masuk</TabsTrigger>
        </TabsList>

        <TabsContent value="masuk" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Gilingan Basah</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="in-category" className="text-base">Asal / Jenis Plastik</Label>
                <Select value={inCategoryId} onValueChange={(val) => val && setInCategoryId(val)}>
                  <SelectTrigger id="in-category" className="h-14 text-lg">
                    <SelectValue placeholder="Pilih sumber...">
                      {inCategoryId ? moduleCategories.find(c => c.id.toString() === inCategoryId)?.name : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {moduleCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()} className="h-12 text-base">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="in-weight" className="text-base">Berat Timbangan (kg)</Label>
                <Input 
                  id="in-weight" 
                  type="text" 
                  inputMode="decimal"
                  placeholder="0"
                  className="h-16 text-2xl font-numeric border-teal-200 focus-visible:ring-teal-500"
                  value={inWeight}
                  onChange={(e) => setInWeight(e.target.value.replace(/[^0-9.]/g, ''))}
                />
                <p className="text-sm text-muted-foreground">Data langsung masuk sebagai stok hasil produksi bersih.</p>
              </div>
              <Button 
                className="w-full h-14 text-lg bg-teal-700 hover:bg-teal-800 touch-target"
                disabled={!inCategoryId || !inWeight}
                onClick={() => setInConfirmOpen(true)}
              >
                Simpan Barang Masuk
              </Button>
            </CardContent>
          </Card>

          <AlertDialog open={inConfirmOpen} onOpenChange={setInConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Gilingan Basah</AlertDialogTitle>
                <AlertDialogDescription className="text-lg">
                  Anda akan menambahkan <strong className="text-teal-600">{inWeight} kg bersih</strong> untuk <strong className="text-foreground">{getCategoryName(inCategoryId)}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-12 text-base">Batal</AlertDialogCancel>
                <AlertDialogAction className="h-12 text-base bg-teal-700" onClick={handleBahanMasuk}>Ya, Simpan</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>

      {/* Riwayat Shortcut */}
      <div className="mt-8">
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-100 text-teal-700 rounded-full">
                <ScrollText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Riwayat Transaksi</h3>
                <p className="text-sm text-muted-foreground">Lihat riwayat lengkap transaksi dan filter berdasarkan tanggal.</p>
              </div>
            </div>
            <Button onClick={() => navigate('/riwayat/basah')} className="bg-teal-700 hover:bg-teal-800 w-full sm:w-auto h-12 text-base px-6 touch-target">
              Buka Riwayat
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
