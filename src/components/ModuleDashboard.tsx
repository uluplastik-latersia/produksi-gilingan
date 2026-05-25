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

import { Factory, Package, ScrollText } from 'lucide-react'

type ModuleDashboardProps = {
  title: string
  moduleType: 'kering' | 'kecil'
}

export function ModuleDashboard({ title, moduleType }: ModuleDashboardProps) {
  const navigate = useNavigate()
  const { categories, inventory, loading, submitTransactionIn, submitTransactionProduction } = useApi()
  
  const moduleCategories = useMemo(() => {
    return categories.filter(c => c.moduleType === moduleType)
  }, [categories, moduleType])

  const moduleInventory = useMemo(() => {
    return inventory.filter(i => i.moduleType === moduleType)
  }, [inventory, moduleType])

  // Form State: Bahan Masuk
  const [inCategoryId, setInCategoryId] = useState('')
  const [inWeight, setInWeight] = useState('')
  const [inConfirmOpen, setInConfirmOpen] = useState(false)

  // Form State: Produksi
  const [prodCategoryId, setProdCategoryId] = useState('')
  const [prodProcessedWeight, setProdProcessedWeight] = useState('')
  const [prodConfirmOpen, setProdConfirmOpen] = useState(false)



  const handleBahanMasuk = async () => {
    const success = await submitTransactionIn({
      categoryId: parseInt(inCategoryId),
      stockType: 'raw',
      weight: parseFloat(inWeight),
    })
    if (success) {
      setInCategoryId('')
      setInWeight('')
      setInConfirmOpen(false)
    }
  }

  const handleProduksi = async () => {
    const success = await submitTransactionProduction({
      categoryId: parseInt(prodCategoryId),
      rawWeight: parseFloat(prodProcessedWeight), // Auto deduct raw material by exact amount of processed
      processedWeight: parseFloat(prodProcessedWeight),
    })
    if (success) {
      setProdCategoryId('')
      setProdProcessedWeight('')
      setProdConfirmOpen(false)
    }
  }

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === parseInt(id))?.name || 'Unknown'
  }

  if (loading) {
    return <div className="p-8 text-center">Loading data...</div>
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">{title}</h1>
        <p className="text-muted-foreground">Kelola bahan baku dan hasil produksi gilingan.</p>
      </div>

      {/* Highlight Data Stok */}
      <div>
        <h2 className="text-xl font-bold mb-3 flex items-center"><Package className="mr-2 h-5 w-5" /> Detail Data Stok</h2>
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b-2 border-slate-200">
                <TableRow>
                  <TableHead className="font-bold text-slate-800">JENIS</TableHead>
                  <TableHead className="text-right font-bold text-slate-800 border-l border-slate-200">BAHAN BAKU</TableHead>
                  <TableHead className="text-right font-bold text-slate-800 border-l border-slate-200">HASIL PRODUKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const itemsToShow = moduleCategories.map(cat => {
                    const raw = moduleInventory.find(i => i.categoryId === cat.id && i.stockType === 'raw')?.currentStock || 0
                    const processed = moduleInventory.find(i => i.categoryId === cat.id && i.stockType === 'processed')?.currentStock || 0
                    return { ...cat, raw, processed }
                  }).filter(cat => cat.raw > 0 || cat.processed > 0)
                  
                  if (itemsToShow.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          Data stok kosong
                        </TableCell>
                      </TableRow>
                    )
                  }
                  
                  return itemsToShow.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                      <TableCell className="font-medium text-slate-700">{item.name}</TableCell>
                      <TableCell className="text-right font-numeric font-medium text-orange-700 border-l border-slate-100">
                        {item.raw.toLocaleString('id-ID')} kg
                      </TableCell>
                      <TableCell className="text-right font-numeric font-bold text-teal-700 border-l border-slate-100">
                        {item.processed.toLocaleString('id-ID')} kg
                      </TableCell>
                    </TableRow>
                  ))
                })()}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="masuk" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-100">
          <TabsTrigger value="masuk" className="text-base h-full touch-target">Input Bahan Masuk</TabsTrigger>
          <TabsTrigger value="produksi" className="text-base h-full touch-target">Input Hasil Produksi</TabsTrigger>
        </TabsList>

        <TabsContent value="masuk" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Bahan Baku Masuk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="in-category" className="text-base">Jenis Plastik</Label>
                <Select value={inCategoryId} onValueChange={(val) => val && setInCategoryId(val)}>
                  <SelectTrigger id="in-category" className="h-14 text-lg">
                    <SelectValue placeholder="Pilih jenis plastik...">
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
                  className="h-16 text-2xl font-numeric"
                  value={inWeight}
                  onChange={(e) => setInWeight(e.target.value.replace(/[^0-9.]/g, ''))}
                />
              </div>
              <Button 
                className="w-full h-14 text-lg bg-teal-700 hover:bg-teal-800 touch-target"
                disabled={!inCategoryId || !inWeight}
                onClick={() => setInConfirmOpen(true)}
              >
                Simpan Bahan Masuk
              </Button>
            </CardContent>
          </Card>

          <AlertDialog open={inConfirmOpen} onOpenChange={setInConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Bahan Masuk</AlertDialogTitle>
                <AlertDialogDescription className="text-lg">
                  Anda akan memasukkan <strong className="text-foreground">{inWeight} kg</strong> bahan baku <strong className="text-foreground">{getCategoryName(inCategoryId)}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-12 text-base">Batal</AlertDialogCancel>
                <AlertDialogAction className="h-12 text-base bg-teal-700" onClick={handleBahanMasuk}>Ya, Simpan</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="produksi" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Hasil Produksi (Gilingan)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prod-category" className="text-base">Jenis Plastik</Label>
                <Select value={prodCategoryId} onValueChange={(val) => val && setProdCategoryId(val)}>
                  <SelectTrigger id="prod-category" className="h-14 text-lg">
                    <SelectValue placeholder="Pilih jenis plastik...">
                      {prodCategoryId ? moduleCategories.find(c => c.id.toString() === prodCategoryId)?.name : null}
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
                <Label htmlFor="prod-processed" className="text-base text-teal-700">Hasil Gilingan (kg)</Label>
                <Input 
                  id="prod-processed" 
                  type="text" 
                  inputMode="decimal"
                  placeholder="0"
                  className="h-16 text-2xl font-numeric border-teal-200 focus-visible:ring-teal-500"
                  value={prodProcessedWeight}
                  onChange={(e) => setProdProcessedWeight(e.target.value.replace(/[^0-9.]/g, ''))}
                />
                <p className="text-sm text-muted-foreground">Sistem akan otomatis mengurangi {prodProcessedWeight || '0'} kg dari stok bahan baku.</p>
              </div>

              <Button 
                className="w-full h-14 text-lg bg-teal-700 hover:bg-teal-800 touch-target"
                disabled={!prodCategoryId || !prodProcessedWeight}
                onClick={() => setProdConfirmOpen(true)}
              >
                <Factory className="mr-2 h-5 w-5" />
                Simpan Data Produksi
              </Button>
            </CardContent>
          </Card>

          <AlertDialog open={prodConfirmOpen} onOpenChange={setProdConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Hasil Produksi</AlertDialogTitle>
                <AlertDialogDescription className="text-lg">
                  Anda akan mencatat hasil gilingan <strong className="text-teal-600">{prodProcessedWeight} kg</strong> untuk <strong className="text-foreground">{getCategoryName(prodCategoryId)}</strong>.
                  <br /><br />
                  <span className="text-sm text-orange-600">Stok bahan baku akan otomatis dikurangi {prodProcessedWeight} kg.</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-12 text-base">Batal</AlertDialogCancel>
                <AlertDialogAction className="h-12 text-base bg-teal-700" onClick={handleProduksi}>Ya, Simpan</AlertDialogAction>
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
            <Button onClick={() => navigate(`/riwayat/${moduleType}`)} className="bg-teal-700 hover:bg-teal-800 w-full sm:w-auto">
              Buka Riwayat
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
