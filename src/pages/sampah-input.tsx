import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/useApi'
import { Trash2, Check, ChevronsUpDown } from 'lucide-react'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function SampahInputPage() {
  const { categories, inventory, loading, submitTransactionSampah } = useApi()
  
  // Exclude oplosan categories, keep kering, kecil, luar, basah
  const validCategories = useMemo(() => {
    return categories
  }, [categories])

  const [categoryId, setCategoryId] = useState('')
  const [open, setOpen] = useState(false)
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const selectedCategory = categories.find(c => c.id === parseInt(categoryId))
  const currentRawStock = inventory.find(i => i.categoryId === parseInt(categoryId) && i.stockType === 'raw')?.currentStock || 0

  const handleSampah = async () => {
    const success = await submitTransactionSampah({
      categoryId: parseInt(categoryId),
      weight: parseFloat(weight),
      notes: notes,
    })
    if (success) {
      setCategoryId('')
      setWeight('')
      setNotes('')
      setConfirmOpen(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading data...</div>
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full pb-24 lg:pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center">
          <Trash2 className="mr-3 h-8 w-8 text-red-600" /> 
          Input Sampah Susut
        </h1>
        <p className="text-muted-foreground">Catat sampah penyusutan atau afkir bahan baku.</p>
      </div>

      <Card>
        <CardHeader className="bg-red-50/50 border-b border-red-100">
          <CardTitle className="text-red-800 flex items-center">
            Form Pembuangan Sampah
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-base">Jenis Plastik</Label>
            <Popover open={open} onOpenChange={setOpen}>
              {/* @ts-expect-error PopoverTrigger asChild type issue */}
              <PopoverTrigger asChild>
                <Button
                  id="category"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-14 text-lg font-normal"
                >
                  {categoryId
                    ? (() => {
                        const c = validCategories.find((cat) => cat.id.toString() === categoryId)
                        return c ? `${c.name} (${c.moduleType.toUpperCase()})` : "Pilih Jenis Plastik"
                      })()
                    : "Pilih Jenis Plastik"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari jenis plastik..." />
                  <CommandList>
                    <CommandEmpty>Jenis plastik tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      {validCategories.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.moduleType}`}
                          onSelect={() => {
                            setCategoryId(c.id.toString())
                            setOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              categoryId === c.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {c.name} ({c.moduleType.toUpperCase()})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {categoryId && (
              <p className="text-sm text-slate-500">Stok Bahan Baku saat ini: <strong className="text-orange-700">{currentRawStock.toLocaleString('id-ID')} kg</strong></p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Berat Sampah (kg)</Label>
            <Input 
              type="number" 
              placeholder="Contoh: 5.5" 
              className="h-12 text-lg font-numeric"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Catatan Tambahan (Opsional)</Label>
            <Input 
              placeholder="Contoh: Kotoran tanah / plastik afkir" 
              className="h-12"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button 
            className="w-full h-14 text-lg mt-4 bg-red-600 hover:bg-red-700" 
            disabled={!categoryId || !weight || parseFloat(weight) <= 0 || parseFloat(weight) > currentRawStock}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-2 h-5 w-5" />
            Catat Pembuangan Sampah
          </Button>
          
          {categoryId && weight && parseFloat(weight) > currentRawStock && (
            <p className="text-sm text-red-500 text-center font-medium">Stok bahan baku tidak mencukupi!</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pencatatan Sampah</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Anda akan mencatat sampah/afkir seberat <strong className="text-slate-900">{weight} kg</strong> dari bahan <strong className="text-slate-900">{selectedCategory?.name}</strong>.
              <br/><br/>
              Aksi ini akan <strong className="text-red-600">mengurangi stok Bahan Baku</strong>. Apakah Anda yakin?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Batal</AlertDialogCancel>
            <AlertDialogAction className="h-12 bg-red-600 hover:bg-red-700 text-white" onClick={handleSampah}>
              Ya, Catat Sampah
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Riwayat Shortcut */}
      <div className="mt-8">
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-700 rounded-full">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Riwayat Sampah</h3>
                <p className="text-sm text-muted-foreground">Lihat riwayat lengkap pembuangan sampah / afkir.</p>
              </div>
            </div>
            <Button onClick={() => window.location.href='/riwayat/sampah'} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
              Buka Riwayat
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
