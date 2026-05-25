import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  InspectionPanel,
  ToolCase,
  SquareArrowRightEnter,
  Sunrise,
  Recycle,
  FileText,
  EthernetPort,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  {
    to: '/gilingan-kering',
    label: 'G. Kering',
    fullLabel: 'Gilingan Kering',
    icon: InspectionPanel,
  },
  {
    to: '/gilingan-kecil',
    label: 'G. Kecil',
    fullLabel: 'Gilingan Kecil',
    icon: ToolCase,
  },
  {
    to: '/gilingan-luar',
    label: 'G. Luar',
    fullLabel: 'Gilingan Luar',
    icon: SquareArrowRightEnter,
  },
  {
    to: '/oplosan',
    label: 'Oplosan',
    fullLabel: 'Oplosan',
    icon: Sunrise,
  },
  {
    to: '/gilingan-basah',
    label: 'G. Basah',
    fullLabel: 'Gilingan Basah',
    icon: EthernetPort,
  },
]

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentNav = navItems.find((item) => item.to === location.pathname)

  return (
    <div className="min-h-svh flex flex-col bg-background md:ml-56 print:ml-0">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 print:hidden">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center">
              <img src="/logo.svg" alt="Logo UPL" className="h-9 w-9 object-contain" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold leading-tight tracking-tight text-foreground">
                PT. ULU PLASTIK LATERSIA
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">
                {currentNav?.fullLabel ?? (location.pathname === '/laporan' ? 'Laporan Bulanan' : 'Produksi Gilingan')}
              </p>
            </div>
          </div>
          
          <div className="ml-auto flex items-center">
            <Button onClick={() => navigate('/laporan')} className="h-10 px-4 gap-2 bg-teal-700 hover:bg-teal-800 text-white shadow-sm rounded-lg touch-target">
              <FileText className="h-5 w-5" />
              <span className="font-medium text-sm hidden sm:inline">Laporan</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-4 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 md:hidden safe-bottom print:hidden">
        <div className="mx-auto flex max-w-lg">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 px-1 text-xs font-medium transition-colors touch-target ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                        isActive ? 'bg-primary/12' : ''
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`}
                      />
                    </div>
                    <span className="leading-none">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Side Navigation - Desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col border-r bg-card z-30 print:hidden">
        <div className="flex items-center gap-2.5 p-4 border-b">
          <div className="flex h-9 w-9 items-center justify-center">
            <img src="/logo.svg" alt="Logo UPL" className="h-8 w-8 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight tracking-tight text-foreground">
              PT. UPL
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Produksi Gilingan
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.fullLabel}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t p-3">
          <p className="text-[10px] text-muted-foreground text-center">
            v1.0.0 • PT. ULU PLASTIK LATERSIA
          </p>
        </div>
      </aside>
    </div>
  )
}
