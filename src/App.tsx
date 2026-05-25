import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { GilinganKeringPage } from '@/pages/gilingan-kering'
import { GilinganKecilPage } from '@/pages/gilingan-kecil'
import { GilinganLuarPage } from '@/pages/gilingan-luar'
import { GilinganBasahPage } from '@/pages/gilingan-basah'
import { OplosanPage } from '@/pages/oplosan'
import { LaporanPage } from '@/pages/laporan'
import { RiwayatPage } from '@/pages/riwayat'
import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/gilingan-kering" replace />} />
            <Route path="/gilingan-kering" element={<GilinganKeringPage />} />
            <Route path="/gilingan-kecil" element={<GilinganKecilPage />} />
            <Route path="/gilingan-luar" element={<GilinganLuarPage />} />
            <Route path="/gilingan-basah" element={<GilinganBasahPage />} />
            <Route path="/oplosan" element={<OplosanPage />} />
            <Route path="/laporan" element={<LaporanPage />} />
            <Route path="/riwayat/:moduleType" element={<RiwayatPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </>
  )
}

export default App
