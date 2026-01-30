'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useSidebar } from '@/contexts/sidebar-context'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Shield,
  Key,
  FileSearch,
  BarChart3,
  PenTool,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  HelpCircle,
  X,
  GraduationCap,
  Mail,
  Boxes,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  moduleCode: string
  badge?: string
}

const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    moduleCode: 'dashboard',
  },
  {
    title: 'Gestión de Tesis',
    href: '/tesis',
    icon: BookOpen,
    moduleCode: 'tesis',
    badge: '12',
  },
  {
    title: 'Firma Digital',
    href: '/firma-peru',
    icon: PenTool,
    moduleCode: 'firma-digital',
  },
  {
    title: 'Reportes',
    href: '/reportes',
    icon: BarChart3,
    moduleCode: 'reportes',
  },
]

const studentNavItems: NavItem[] = [
  {
    title: 'Mis Tesis',
    href: '/mis-tesis',
    icon: GraduationCap,
    moduleCode: 'mis-tesis',
  },
  {
    title: 'Mis Invitaciones',
    href: '/mis-invitaciones',
    icon: Mail,
    moduleCode: 'mis-invitaciones',
  },
]

const docenteNavItems: NavItem[] = [
  {
    title: 'Mis Asesorías',
    href: '/mis-asesorias',
    icon: GraduationCap,
    moduleCode: 'mis-asesorias',
  },
]

const adminNavItems: NavItem[] = [
  {
    title: 'Usuarios',
    href: '/admin/usuarios',
    icon: Users,
    moduleCode: 'usuarios',
  },
  {
    title: 'Roles',
    href: '/admin/roles',
    icon: Shield,
    moduleCode: 'roles',
  },
  {
    title: 'Módulos',
    href: '/admin/modulos',
    icon: Boxes,
    moduleCode: 'modulos',
  },
  {
    title: 'Permisos',
    href: '/admin/permisos',
    icon: Key,
    moduleCode: 'permisos',
  },
  {
    title: 'Auditoría',
    href: '/admin/auditoria',
    icon: FileSearch,
    moduleCode: 'auditoria',
  },
  {
    title: 'Configuración',
    href: '/admin/configuracion',
    icon: Settings,
    moduleCode: 'configuracion',
  },
]

// Contenido compartido del sidebar
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { hasPermission, hasRole, logout } = useAuth()

  const visibleMainItems = mainNavItems.filter((item) =>
    hasPermission(item.moduleCode, 'view')
  )

  // Items de estudiante visibles solo para usuarios con rol ESTUDIANTE
  const visibleStudentItems = hasRole('ESTUDIANTE') ? studentNavItems : []

  // Items de docente visibles solo para usuarios con rol DOCENTE
  const visibleDocenteItems = hasRole('DOCENTE') ? docenteNavItems : []

  const visibleAdminItems = adminNavItems.filter((item) =>
    hasPermission(item.moduleCode, 'view')
  )

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const Icon = item.icon

    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary-foreground')} />
        <span className="flex-1">{item.title}</span>
        {item.badge && (
          <span className={cn(
            'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium',
            isActive
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-primary/10 text-primary'
          )}>
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Navegación principal */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Principal
        </p>
        {visibleMainItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {visibleStudentItems.length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Estudiante
            </p>
            {visibleStudentItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        )}

        {visibleDocenteItems.length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Docente
            </p>
            {visibleDocenteItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        )}

        {visibleAdminItems.length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Administración
            </p>
            {visibleAdminItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t p-3 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={onNavigate}
        >
          <HelpCircle className="h-5 w-5" />
          Ayuda
        </Button>

        <Button
          variant="ghost"
          onClick={() => {
            logout()
            onNavigate?.()
          }}
          className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </Button>

        <p className="px-3 pt-2 text-xs text-muted-foreground text-center">
          v1.0.0
        </p>
      </div>
    </div>
  )
}

// Sidebar para móvil (Sheet/Drawer)
export function MobileSidebar() {
  const { isOpen, close } = useSidebar()

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Image
                src="/logo/logounamad.png"
                alt="UNAMAD"
                width={28}
                height={28}
                className="rounded"
              />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold">Sistema de Tesis</span>
              <span className="text-xs text-muted-foreground font-normal">UNAMAD</span>
            </div>
          </SheetTitle>
        </SheetHeader>
        <SidebarContent onNavigate={close} />
      </SheetContent>
    </Sheet>
  )
}

// Sidebar para desktop
export function DesktopSidebar() {
  const pathname = usePathname()
  const { hasPermission, hasRole, logout } = useAuth()
  const { isCollapsed, setIsCollapsed } = useSidebar()

  const visibleMainItems = mainNavItems.filter((item) =>
    hasPermission(item.moduleCode, 'view')
  )

  // Items de estudiante visibles solo para usuarios con rol ESTUDIANTE
  const visibleStudentItems = hasRole('ESTUDIANTE') ? studentNavItems : []

  // Items de docente visibles solo para usuarios con rol DOCENTE
  const visibleDocenteItems = hasRole('DOCENTE') ? docenteNavItems : []

  const visibleAdminItems = adminNavItems.filter((item) =>
    hasPermission(item.moduleCode, 'view')
  )

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const Icon = item.icon

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary-foreground')} />
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <span className={cn(
                'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-primary/10 text-primary'
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    )

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.title}
            {item.badge && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return linkContent
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'hidden lg:flex sticky top-16 h-[calc(100vh-4rem)] border-r bg-card transition-all duration-300 flex-col',
          isCollapsed ? 'w-[70px]' : 'w-[260px]'
        )}
      >
        {/* Header del sidebar */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-4 border-b',
          isCollapsed && 'justify-center px-2'
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Image
                  src="/logo/logounamad.png"
                  alt="UNAMAD"
                  width={28}
                  height={28}
                  className="rounded"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Sistema de Tesis</span>
                <span className="text-xs text-muted-foreground">UNAMAD</span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn('h-8 w-8 ml-auto', isCollapsed && 'ml-0')}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Principal
            </p>
          )}
          {visibleMainItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {visibleStudentItems.length > 0 && (
            <>
              <Separator className="my-4" />
              {!isCollapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estudiante
                </p>
              )}
              {visibleStudentItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </>
          )}

          {visibleDocenteItems.length > 0 && (
            <>
              <Separator className="my-4" />
              {!isCollapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Docente
                </p>
              )}
              {visibleDocenteItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </>
          )}

          {visibleAdminItems.length > 0 && (
            <>
              <Separator className="my-4" />
              {!isCollapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Administración
                </p>
              )}
              {visibleAdminItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t p-3 space-y-1">
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full h-10">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Ayuda</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
            >
              <HelpCircle className="h-5 w-5" />
              Ayuda
            </Button>
          )}

          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout()}
                  className="w-full h-10 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Cerrar sesión</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={() => logout()}
              className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </Button>
          )}

          {!isCollapsed && (
            <p className="px-3 pt-2 text-xs text-muted-foreground text-center">
              v1.0.0
            </p>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}

// Export combinado para compatibilidad
export function DashboardSidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  )
}
