import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useApi } from '@/hooks/useApi'
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar as CalendarIcon, ArrowLeft, Search, Printer } from "lucide-react"

import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function RiwayatPage() {
  const { moduleType } = useParams<{ moduleType: string }>()
  const navigate = useNavigate()
  const { fetchTransactions } = useApi()
  
  const currentDate = new Date()
  
  // Default to showing the last 30 days
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 30),
    to: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
  })
  
  const [searchQuery, setSearchQuery] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)



  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      if (date?.from && date?.to) {
        const data = await fetchTransactions(moduleType, date.from, date.to)
        setTransactions(data)
      } else if (date?.from) {
        const data = await fetchTransactions(moduleType, date.from, date.from)
        setTransactions(data)
      } else {
        // If no date selected, maybe fetch without date filter but the backend might limit to 200
        const data = await fetchTransactions(moduleType)
        setTransactions(data)
      }
      setIsLoading(false)
    }
    loadData()
  }, [date, moduleType])

  const filteredTransactions = useMemo(() => {
    // Filter out 'production_out' completely
    let validTransactions = transactions.filter(t => t.transactionType !== 'production_out');

    if (!searchQuery.trim()) return validTransactions;
    const lowerQuery = searchQuery.toLowerCase()
    
    return validTransactions.filter(t => {
      const typeLabel = t.transactionType === 'in' ? 'Masuk' : 
                        t.transactionType === 'production_out' ? 'Bahan Baku' :
                        t.transactionType === 'production_in' ? 'Hasil Produksi' :
                        t.transactionType === 'mix_out' ? 'Oplosan Keluar' : t.transactionType
      
      const searchStr = `${t.categoryName || ''} ${typeLabel} ${t.notes || ''} ${t.batchName || ''}`.toLowerCase()
      return searchStr.includes(lowerQuery)
    })
  }, [transactions, searchQuery])

  const formatModuleType = (type: string | undefined) => {
    switch(type) {
      case 'kering': return 'Gilingan Kering'
      case 'kecil': return 'Gilingan Kecil'
      case 'luar': return 'Gilingan Luar'
      case 'basah': return 'Gilingan Basah'
      case 'oplosan': return 'Oplosan'
      default: return 'Semua Riwayat'
    }
  }

  const getBackPath = (type: string | undefined) => {
    switch(type) {
      case 'kering': return '/gilingan-kering'
      case 'kecil': return '/gilingan-kecil'
      case 'luar': return '/gilingan-luar'
      case 'oplosan': return '/oplosan'
      default: return '/'
    }
  }

  const oplosanGroups = useMemo(() => {
    if (moduleType !== 'oplosan') return []
    
    const groups: Record<string, {
      batchName: string;
      createdAt: string;
      totalWeight: number;
      notes: string;
      items: { categoryName: string; weight: number }[];
    }> = {}

    filteredTransactions.forEach(t => {
      const key = t.batchId ? `batch_${t.batchId}` : `${t.batchName}_${t.createdAt}`
      if (!groups[key]) {
        groups[key] = {
          batchName: t.batchName || 'Tanpa Nama Batch',
          createdAt: t.createdAt,
          totalWeight: 0,
          notes: t.notes || '',
          items: []
        }
      }
      groups[key].totalWeight += t.weight
      groups[key].items.push({ categoryName: t.categoryName || 'Unknown', weight: t.weight })
    })
    
    // Sort descending by time
    return Object.values(groups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [filteredTransactions, moduleType])

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(getBackPath(moduleType))}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Riwayat Transaksi</h1>
            <p className="text-muted-foreground">{formatModuleType(moduleType)}</p>
          </div>
        </div>
      </div>

      <div ref={tableRef} className="bg-background">
        <div className="hidden print:block screenshot-header mb-6">
          <h1 className="text-2xl font-bold">Riwayat Transaksi {formatModuleType(moduleType)}</h1>
          <p className="text-sm">
            Periode: {date?.from ? format(date.from, "LLL dd, y", { locale: id }) : 'Semua Waktu'} 
            {date?.to ? ` - ${format(date.to, "LLL dd, y", { locale: id })}` : ''}
          </p>
        </div>

        <Card className="screenshot-card">
          <CardHeader className="pb-4 print:hidden screenshot-hide">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari jenis plastik, keterangan..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex w-full sm:w-auto gap-2">
              <Popover>
                {/* @ts-expect-error PopoverTrigger asChild type issue */}
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[260px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y", { locale: id })} -{" "}
                          {format(date.to, "LLL dd, y", { locale: id })}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y", { locale: id })
                      )
                    ) : (
                      <span>Pilih Rentang Tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    // @ts-expect-error ignore initialFocus type
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    locale={id}
                  />
                </PopoverContent>
              </Popover>

              <Button onClick={() => window.print()} variant="outline" className="text-teal-700 border-teal-200 hover:bg-teal-50" title="Print Data">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto table-wrapper">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Jenis Transaksi</TableHead>
                    {moduleType !== 'oplosan' ? (
                      <TableHead>Jenis Plastik</TableHead>
                    ) : (
                      <TableHead>Nama Batch & Campuran</TableHead>
                    )}
                    <TableHead className="text-right">{moduleType === 'oplosan' ? 'Total Berat' : 'Berat (Kg)'}</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Belum ada riwayat transaksi pada rentang waktu ini.
                      </TableCell>
                    </TableRow>
                  ) : moduleType === 'oplosan' ? (
                    oplosanGroups.map((group, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="whitespace-nowrap align-top pt-4">
                          <div className="text-sm">{new Date(group.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          <div className="text-xs text-muted-foreground">{new Date(group.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            Batch Oplosan
                          </span>
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <div className="font-bold text-slate-800 mb-2">{group.batchName}</div>
                          <ul className="space-y-1 w-full min-w-[200px]">
                            {group.items.map((item, i) => (
                              <li key={i} className="text-sm flex justify-between gap-4 border-b border-slate-100 pb-1 last:border-0">
                                <span className="text-muted-foreground">{item.categoryName}</span>
                                <span className="font-numeric font-medium text-slate-700">{item.weight.toLocaleString('id-ID')} kg</span>
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell className="text-right align-top pt-4">
                          <div className="font-numeric font-bold text-lg text-teal-800">
                            {group.totalWeight.toLocaleString('id-ID')} kg
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground align-top pt-4" title={group.notes}>
                          {group.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    filteredTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </TableCell>
                        <TableCell>
                          {t.transactionType === 'in' ? (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Masuk
                            </span>
                          ) : t.transactionType === 'production_out' ? (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                              Bahan Baku
                            </span>
                          ) : t.transactionType === 'production_in' ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Hasil Produksi
                            </span>
                          ) : t.transactionType === 'mix_out' ? (
                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                              Oplosan Keluar
                            </span>
                          ) : (
                            t.transactionType
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{t.categoryName || '-'}</TableCell>
                        <TableCell className="text-right font-numeric font-medium text-lg text-teal-800">
                          {t.weight.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={t.notes}>
                          {t.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
