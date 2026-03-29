'use client'

import Link from 'next/link'
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
  GraduationCap,
  Mail,
  Boxes,
  Inbox,
  ClipboardCheck,
  FileSpreadsheet,
} from 'lucide-react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Nav item types & data ─────────────────────────────────────────────────────

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  moduleCode: string
  badge?: string
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, moduleCode: 'dashboard' },
  { title: 'Gestión de Tesis', href: '/tesis', icon: BookOpen, moduleCode: 'tesis' },
  { title: 'Firma Digital', href: '/firma-peru', icon: PenTool, moduleCode: 'firma-digital' },
  { title: 'Reportes', href: '/reportes', icon: BarChart3, moduleCode: 'reportes' },
]

const studentNavItems: NavItem[] = [
  { title: 'Mis Tesis', href: '/mis-tesis', icon: GraduationCap, moduleCode: 'mis-tesis' },
  { title: 'Mis Invitaciones', href: '/mis-invitaciones', icon: Mail, moduleCode: 'mis-invitaciones' },
]

const docenteNavItems: NavItem[] = [
  { title: 'Mis Asesorías', href: '/mis-asesorias', icon: GraduationCap, moduleCode: 'mis-asesorias' },
  { title: 'Mis Evaluaciones', href: '/mis-evaluaciones', icon: ClipboardCheck, moduleCode: 'mis-evaluaciones' },
]

const mesaPartesNavItems: NavItem[] = [
  { title: 'Mesa de Partes', href: '/mesa-partes', icon: Inbox, moduleCode: 'mesa-partes' },
  { title: 'Reportes MP', href: '/mesa-partes/reportes', icon: FileSpreadsheet, moduleCode: 'mesa-partes' },
]

const adminNavItems: NavItem[] = [
  { title: 'Usuarios', href: '/admin/usuarios', icon: Users, moduleCode: 'usuarios' },
  { title: 'Roles', href: '/admin/roles', icon: Shield, moduleCode: 'roles' },
  { title: 'Módulos', href: '/admin/modulos', icon: Boxes, moduleCode: 'modulos' },
  { title: 'Permisos', href: '/admin/permisos', icon: Key, moduleCode: 'permisos' },
  { title: 'Auditoría', href: '/admin/auditoria', icon: FileSearch, moduleCode: 'auditoria' },
  { title: 'Configuración', href: '/admin/configuracion', icon: Settings, moduleCode: 'configuracion' },
]

interface NavSection {
  label: string
  items: NavItem[]
}

const allSections: NavSection[] = [
  { label: 'Principal', items: mainNavItems },
  { label: 'Estudiante', items: studentNavItems },
  { label: 'Docente', items: docenteNavItems },
  { label: 'Gestión', items: mesaPartesNavItems },
  { label: 'Administración', items: adminNavItems },
]

// ─── Shared subcomponents ───────────────────────────────────────────────────────

function SidebarNavLink({
  item,
  collapsed,
  pathname,
  onNavigate,
}: {
  item: NavItem
  collapsed?: boolean
  pathname: string
  onNavigate?: () => void
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon

  const linkContent = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150',
        isActive
          ? 'bg-sidebar-primary/10 text-sidebar-primary font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-full before:bg-sidebar-primary'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed && 'flex-col justify-center px-0 py-2.5 gap-1'
      )}
    >
      <Icon className={cn(
        'flex-shrink-0',
        collapsed ? 'h-5 w-5' : 'h-[18px] w-[18px]',
        isActive && 'text-sidebar-primary'
      )} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.title}</span>
          {item.badge && (
            <span className="ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-sidebar-primary/10 text-sidebar-primary">
              {item.badge}
            </span>
          )}
        </>
      )}
      {collapsed && isActive && (
        <span className="h-1 w-1 rounded-full bg-sidebar-primary" />
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.title}
          {item.badge && (
            <span className="ml-1 rounded-md bg-sidebar-primary/10 px-1.5 py-0.5 text-xs text-sidebar-primary">
              {item.badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

function SidebarNavSections({
  collapsed,
  pathname,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed?: boolean
  pathname: string
  onNavigate?: () => void
  onToggleCollapse?: () => void
}) {
  const { hasPermission } = useAuth()

  const visibleSections = allSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasPermission(item.moduleCode, 'view')),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <>
      {visibleSections.map((section, idx) => (
        <div key={section.label}>
          {collapsed ? (
            idx > 0 && <div className="h-px w-6 mx-auto bg-sidebar-border my-3" />
          ) : (
            <div className={cn(
              'flex items-center px-3 pb-1.5',
              idx > 0 ? 'pt-5' : 'pt-0'
            )}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 flex-1">
                {section.label}
              </p>
              {idx === 0 && onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="h-6 w-6 flex items-center justify-center rounded-full border border-sidebar-border text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Ayuda — último item de la nav */}
      {collapsed ? (
        <>
          <div className="h-px w-6 mx-auto bg-sidebar-border my-3" />
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button className="flex w-full items-center justify-center rounded-md py-2.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-150">
                <HelpCircle className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Ayuda</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <div className="pt-5">
          <button
            onClick={onNavigate}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-150"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
            <span>Ayuda</span>
          </button>
        </div>
      )}
    </>
  )
}

function UserFooter({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { user, logout } = useAuth()

  const initials = user
    ? `${user.nombres.charAt(0)}${user.apellidoPaterno.charAt(0)}`
    : 'U'

  const nombreCompleto = user
    ? `${user.nombres} ${user.apellidoPaterno}`
    : ''

  const primerRol = user?.roles?.[0]?.nombre ?? 'Usuario'

  if (collapsed) {
    return (
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link href="/perfil" onClick={onNavigate} className="flex justify-center py-1.5 rounded-md hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-8 w-8">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={nombreCompleto} />}
                <AvatarFallback className="bg-sidebar-primary/10 text-sidebar-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{nombreCompleto}</p>
            <p className="text-xs text-muted-foreground">{primerRol}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => { logout(); onNavigate?.() }}
              className="flex w-full justify-center rounded-md py-2 text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Cerrar sesión</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="border-t border-sidebar-border p-3 space-y-2">
      <Link
        href="/perfil"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors"
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={nombreCompleto} />}
          <AvatarFallback className="bg-sidebar-primary/10 text-sidebar-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-sidebar-foreground truncate">{nombreCompleto}</p>
          <p className="text-[11px] text-sidebar-foreground/50 truncate">{primerRol}</p>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); logout(); onNavigate?.() }}
          className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </Link>

      <p className="text-[10px] text-sidebar-foreground/30 text-center">v1.0.0</p>
    </div>
  )
}

// ─── Mobile sidebar ─────────────────────────────────────────────────────────────

export function MobileSidebar() {
  const { isOpen, close } = useSidebar()
  const pathname = usePathname()

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-sidebar-border">
        <SheetHeader className="sr-only">
          <SheetTitle>Menú de navegación</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <ScrollArea className="flex-1">
            <nav className="px-3 py-3">
              <SidebarNavSections pathname={pathname} onNavigate={close} />
            </nav>
          </ScrollArea>
          <UserFooter onNavigate={close} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Desktop sidebar ────────────────────────────────────────────────────────────

export function DesktopSidebar() {
  const pathname = usePathname()
  const { isCollapsed, setIsCollapsed } = useSidebar()

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'hidden lg:flex border-r border-sidebar-border bg-sidebar shadow-sm transition-[width] duration-300 ease-in-out flex-col overflow-hidden',
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center py-3 border-b border-sidebar-border">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsCollapsed(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-full border border-sidebar-border text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expandir menú</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className={cn('py-3 whitespace-nowrap', isCollapsed ? 'px-2' : 'px-3')}>
            <SidebarNavSections
              collapsed={isCollapsed}
              pathname={pathname}
              onToggleCollapse={() => setIsCollapsed(true)}
            />
          </nav>
        </ScrollArea>

        {/* Footer */}
        <UserFooter collapsed={isCollapsed} />
      </aside>
    </TooltipProvider>
  )
}

// ─── Combined export ────────────────────────────────────────────────────────────

export function DashboardSidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  )
}
