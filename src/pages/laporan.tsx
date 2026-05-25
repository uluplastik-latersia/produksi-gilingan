import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi } from '@/hooks/useApi'
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar as CalendarIcon, Printer } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function LaporanPage() {
  const { fetchMonthlySummary } = useApi()
  
  const currentDate = new Date()
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    to: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
  })
  
  const [summaryData, setSummaryData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [printingModule, setPrintingModule] = useState<string | null>(null)

  useEffect(() => {
    const handleAfterPrint = () => setPrintingModule(null)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      if (date?.from && date?.to) {
        const endOfDay = new Date(date.to)
        endOfDay.setHours(23, 59, 59, 999)
        const data = await fetchMonthlySummary(
          date.from.getFullYear(),
          date.from.getMonth() + 1,
          date.from,
          endOfDay
        )
        setSummaryData(data)
      } else if (date?.from) {
        const endOfDay = new Date(date.from)
        endOfDay.setHours(23, 59, 59, 999)
        const data = await fetchMonthlySummary(
          date.from.getFullYear(),
          date.from.getMonth() + 1,
          date.from,
          endOfDay
        )
        setSummaryData(data)
      } else {
        setSummaryData([])
      }
      setIsLoading(false)
    }
    loadData()
  }, [date])

  // Process data to group by category and calculate total in vs production
  const processedSummary = useMemo(() => {
    const grouped: Record<string, { categoryName: string, moduleType: string, masuk: number, produksi: number }> = {}
    
    summaryData.forEach(item => {
      const id = item.categoryId
      if (!grouped[id]) {
        grouped[id] = {
          categoryName: item.categoryName,
          moduleType: item.moduleType,
          masuk: 0,
          produksi: 0
        }
      }
      
      if (item.transactionType === 'in') {
        grouped[id].masuk += item.totalWeight
      } else if (item.transactionType === 'production_in') {
        // we count production_in as hasil produksi (barang bersih yang bertambah)
        grouped[id].produksi += item.totalWeight
      }
    })
    
    return Object.values(grouped).sort((a, b) => {
      if (a.moduleType !== b.moduleType) return a.moduleType.localeCompare(b.moduleType)
      return a.categoryName.localeCompare(b.categoryName)
    })
  }, [summaryData])

  const formatModuleType = (type: string) => {
    switch(type) {
      case 'basah': return 'Gilingan Basah'
      case 'kering': return 'Gilingan Kering'
      case 'kecil': return 'Gilingan Kecil'
      case 'luar': return 'Gilingan Luar'
      default: return type
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Laporan Produksi</h1>
        <p className="text-muted-foreground">Ringkasan bulanan total bahan masuk dan hasil gilingan produksi.</p>
      </div>

      <Card className="print:hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <CardTitle>Periode Laporan</CardTitle>
            <CardDescription>Pilih rentang tanggal untuk melihat laporan produksi</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "d LLL y", { locale: id })} -{" "}
                        {format(date.to, "d LLL y", { locale: id })}
                      </>
                    ) : (
                      format(date.from, "d LLL y", { locale: id })
                    )
                  ) : (
                    <span>Pilih rentang tanggal</span>
                  )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  locale={id}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-6 mt-2">
        {['basah', 'kering', 'kecil', 'luar'].map((modType) => {
        const moduleData = processedSummary.filter(item => item.moduleType === modType)
        
        return (
          <Card key={modType} className={cn("screenshot-card", printingModule && printingModule !== modType && "print:hidden")}>
            {/* Header for print mode */}
            <div className="hidden print:block mb-6 pt-4 text-center">
              <h2 className="text-2xl font-bold text-slate-800">{formatModuleType(modType)}</h2>
              <p className="text-slate-600 mt-1">
                Periode: {date?.from ? format(date.from, "d LLL y", { locale: id }) : ''} 
                {date?.to && date.from !== date.to ? ` - ${format(date.to, "d LLL y", { locale: id })}` : ''}
              </p>
            </div>

            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4 print:hidden">
              <CardTitle className="text-xl text-teal-800">{formatModuleType(modType)}</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-teal-700 border-teal-200 hover:bg-teal-50"
                onClick={() => {
                  setPrintingModule(modType)
                  setTimeout(() => window.print(), 100)
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold text-slate-800 pl-6">Jenis Plastik</TableHead>
                      <TableHead className="text-right font-semibold text-slate-800">Total Bahan Masuk (kg)</TableHead>
                      <TableHead className="text-right font-semibold text-slate-800 pr-6">Total Hasil Produksi (kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">Memuat data laporan...</TableCell>
                      </TableRow>
                    ) : moduleData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Tidak ada data transaksi di bulan ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {moduleData.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-base pl-6">{item.categoryName}</TableCell>
                            <TableCell className="text-right font-numeric text-lg text-orange-700 font-medium">
                              {item.masuk > 0 ? item.masuk.toLocaleString('id-ID') : '-'}
                            </TableCell>
                            <TableCell className="text-right font-numeric text-lg text-teal-700 font-bold pr-6">
                              {item.produksi > 0 ? item.produksi.toLocaleString('id-ID') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-100 hover:bg-slate-100 font-bold">
                          <TableCell className="text-base pl-6">TOTAL KESELURUHAN</TableCell>
                          <TableCell className="text-right font-numeric text-xl text-orange-800">
                            {moduleData.reduce((sum, item) => sum + item.masuk, 0) > 0 
                              ? moduleData.reduce((sum, item) => sum + item.masuk, 0).toLocaleString('id-ID') 
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-numeric text-xl text-teal-800 pr-6">
                            {moduleData.reduce((sum, item) => sum + item.produksi, 0) > 0 
                              ? moduleData.reduce((sum, item) => sum + item.produksi, 0).toLocaleString('id-ID') 
                              : '-'}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })}
      </div>
    </div>
  )
}
