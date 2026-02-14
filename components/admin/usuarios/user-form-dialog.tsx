'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Loader2,
  Eye,
  EyeOff,
  Search,
  Check,
  AlertCircle,
  GraduationCap,
  Briefcase,
  KeyRound,
  Shield,
  ShieldCheck,
  User,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import type { AdminUserResponse } from '@/lib/admin/types'

interface Role {
  id: string
  nombre: string
  codigo: string
  color: string | null
}

interface Facultad {
  id: string
  nombre: string
  codigo: string
}

interface SuggestedRole {
  id: string
  codigo: string
  nombre: string
  color: string | null
}

interface DetectionResult {
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  email: string | null
  emailPersonal: string | null
  detectedRoles: string[]
  suggestedRoles: SuggestedRole[]
  studentData?: {
    carreras: {
      codigoEstudiante: string
      carreraNombre: string
      facultadNombre: string
      creditosAprobados: number
    }[]
  }
  teacherData?: {
    codigoDocente: string
    departamentoAcademico: string
    facultadNombre: string
  }
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: AdminUserResponse | null
  roles?: Role[]
  onSubmit: (data: any) => Promise<void>
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  roles = [],
  onSubmit,
}: UserFormDialogProps) {
  const { authFetch } = useAuth()
  const isEditing = !!user

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null)
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null)
  const [isValidated, setIsValidated] = useState(false)
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [mesaPartesFacultadId, setMesaPartesFacultadId] = useState<string>('')

  const [formData, setFormData] = useState({
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    email: '',
    emailPersonal: '',
    password: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    telefono: '',
    selectedRoleIds: [] as string[],
    isActive: true,
    isVerified: true, // En admin, verificar por defecto
  })

  // Cargar facultades al abrir el diálogo
  useEffect(() => {
    if (open) {
      fetch('/api/facultades')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setFacultades(data.data)
          }
        })
        .catch(console.error)
    }
  }, [open])

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (user) {
      setFormData({
        tipoDocumento: user.tipoDocumento,
        numeroDocumento: user.numeroDocumento,
        email: user.email,
        emailPersonal: user.emailPersonal || '',
        password: '',
        nombres: user.nombres,
        apellidoPaterno: user.apellidoPaterno,
        apellidoMaterno: user.apellidoMaterno,
        telefono: user.telefono || '',
        selectedRoleIds: [],
        isActive: user.isActive,
        isVerified: user.isVerified,
      })
      setIsValidated(true) // Editing existing user
    } else {
      setFormData({
        tipoDocumento: 'DNI',
        numeroDocumento: '',
        email: '',
        emailPersonal: '',
        password: '',
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        telefono: '',
        selectedRoleIds: [],
        isActive: true,
        isVerified: true,
      })
      setIsValidated(false)
      setDetectionResult(null)
    }
    setErrors({})
    setSearchError(null)
    setSearchSuccess(null)
    setMesaPartesFacultadId('')
  }, [user, open])

  // Search user in external APIs
  const handleSearch = async () => {
    if (!formData.numeroDocumento || formData.numeroDocumento.length < 8) {
      setSearchError('El número de documento debe tener al menos 8 caracteres')
      return
    }

    setIsSearching(true)
    setSearchError(null)
    setSearchSuccess(null)
    setDetectionResult(null)

    try {
      const response = await authFetch('/api/admin/users/search', {
        method: 'POST',
        body: JSON.stringify({ numeroDocumento: formData.numeroDocumento }),
      })

      const data = await response.json()

      if (data.success) {
        const result = data.data as DetectionResult
        setDetectionResult(result)
        setSearchSuccess(data.message)
        setIsValidated(true)

        // Auto-fill form data
        setFormData(prev => ({
          ...prev,
          nombres: result.nombres,
          apellidoPaterno: result.apellidoPaterno,
          apellidoMaterno: result.apellidoMaterno,
          email: result.email || '',
          emailPersonal: result.emailPersonal || '',
          // Auto-select detected roles
          selectedRoleIds: result.suggestedRoles.map(r => r.id),
        }))
      } else {
        setSearchError(data.message || 'Error al buscar usuario')
        if (data.error === 'USER_EXISTS') {
          setSearchError(`Ya existe: ${data.existingUser.nombres} ${data.existingUser.apellidoPaterno} (${data.existingUser.roles.join(', ')})`)
        }
      }
    } catch (err) {
      setSearchError('Error de conexión al buscar')
    } finally {
      setIsSearching(false)
    }
  }

  // Toggle role selection
  const toggleRole = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedRoleIds: prev.selectedRoleIds.includes(roleId)
        ? prev.selectedRoleIds.filter(id => id !== roleId)
        : [...prev.selectedRoleIds, roleId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      // Preparar roles con contexto para MESA_PARTES
      const mesaPartesRole = roles.find(r => r.codigo === 'MESA_PARTES')
      const rolesWithContext = formData.selectedRoleIds.map(roleId => {
        if (mesaPartesRole && roleId === mesaPartesRole.id && mesaPartesFacultadId) {
          return {
            roleId,
            contextType: 'FACULTAD',
            contextId: mesaPartesFacultadId,
          }
        }
        return { roleId }
      })

      const submitData = isEditing
        ? {
            email: formData.email,
            emailPersonal: formData.emailPersonal || undefined,
            ...(formData.password && { password: formData.password }),
            nombres: formData.nombres,
            apellidoPaterno: formData.apellidoPaterno,
            apellidoMaterno: formData.apellidoMaterno,
            telefono: formData.telefono || undefined,
            isActive: formData.isActive,
            isVerified: formData.isVerified,
          }
        : {
            tipoDocumento: formData.tipoDocumento,
            numeroDocumento: formData.numeroDocumento,
            email: formData.email,
            emailPersonal: formData.emailPersonal || undefined,
            password: formData.password,
            nombres: formData.nombres,
            apellidoPaterno: formData.apellidoPaterno,
            apellidoMaterno: formData.apellidoMaterno,
            telefono: formData.telefono || undefined,
            roleIds: formData.selectedRoleIds,
            rolesWithContext, // Incluir roles con contexto
            isActive: formData.isActive,
            isVerified: formData.isVerified,
            // Include detection data for creating student/teacher records
            studentData: detectionResult?.studentData,
            teacherData: detectionResult?.teacherData,
          }

      await onSubmit(submitData)
      onOpenChange(false)
    } catch (err: any) {
      if (err.details) {
        setErrors(err.details)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getError = (field: string) => errors[field]?.[0]

  const getRoleIcon = (codigo: string) => {
    switch (codigo) {
      case 'ESTUDIANTE':
        return <GraduationCap className="h-4 w-4" />
      case 'DOCENTE':
        return <Briefcase className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuario' : 'Crear Usuario'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del usuario'
              : 'Busca por DNI para autocompletar los datos desde el sistema universitario'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Documento con búsqueda */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select
                value={formData.tipoDocumento}
                onValueChange={(v) => setFormData({ ...formData, tipoDocumento: v })}
                disabled={isEditing || isValidated}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="CARNET_EXTRANJERIA">Carnet Extranjeria</SelectItem>
                  <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Numero de Documento</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.numeroDocumento}
                  onChange={(e) => {
                    setFormData({ ...formData, numeroDocumento: e.target.value })
                    if (isValidated && !isEditing) {
                      setIsValidated(false)
                      setDetectionResult(null)
                      setSearchSuccess(null)
                    }
                  }}
                  disabled={isEditing}
                  placeholder="12345678"
                  className="flex-1"
                />
                {!isEditing && (
                  <Button
                    type="button"
                    variant={isValidated ? "outline" : "default"}
                    onClick={handleSearch}
                    disabled={isSearching || isValidated}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isValidated ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              {getError('numeroDocumento') && (
                <p className="text-xs text-destructive">{getError('numeroDocumento')}</p>
              )}
            </div>
          </div>

          {/* Search results / errors */}
          {searchError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}

          {searchSuccess && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                {searchSuccess}
              </AlertDescription>
            </Alert>
          )}

          {/* Detected roles info */}
          {detectionResult && detectionResult.detectedRoles.length > 1 && (
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                Este usuario es <strong>{detectionResult.detectedRoles.join(' y ')}</strong>.
                Se asignarán ambos roles automáticamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Student info */}
          {detectionResult?.studentData && detectionResult.studentData.carreras.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Carreras registradas
              </p>
              <div className="space-y-1">
                {detectionResult.studentData.carreras.map((c, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {c.carreraNombre} - {c.facultadNombre} ({c.creditosAprobados} créditos)
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Teacher info */}
          {detectionResult?.teacherData && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Información docente
              </p>
              <p className="text-xs text-muted-foreground">
                {detectionResult.teacherData.departamentoAcademico} - {detectionResult.teacherData.facultadNombre}
              </p>
            </div>
          )}

          {/* Nombres (solo si está validado o editando) */}
          {(isValidated || isEditing) && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nombres</Label>
                  <Input
                    value={formData.nombres}
                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    placeholder="Juan"
                    readOnly={!!detectionResult}
                    className={detectionResult ? 'bg-muted' : ''}
                  />
                  {getError('nombres') && (
                    <p className="text-xs text-destructive">{getError('nombres')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Apellido Paterno</Label>
                  <Input
                    value={formData.apellidoPaterno}
                    onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                    placeholder="Perez"
                    readOnly={!!detectionResult}
                    className={detectionResult ? 'bg-muted' : ''}
                  />
                  {getError('apellidoPaterno') && (
                    <p className="text-xs text-destructive">{getError('apellidoPaterno')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Apellido Materno</Label>
                  <Input
                    value={formData.apellidoMaterno}
                    onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value })}
                    placeholder="Garcia"
                    readOnly={!!detectionResult}
                    className={detectionResult ? 'bg-muted' : ''}
                  />
                  {getError('apellidoMaterno') && (
                    <p className="text-xs text-destructive">{getError('apellidoMaterno')}</p>
                  )}
                </div>
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Institucional</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@unamad.edu.pe"
                    readOnly={!!detectionResult?.email}
                    className={detectionResult?.email ? 'bg-muted' : ''}
                  />
                  {getError('email') && (
                    <p className="text-xs text-destructive">{getError('email')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email Personal (opcional)</Label>
                  <Input
                    type="email"
                    value={formData.emailPersonal}
                    onChange={(e) => setFormData({ ...formData, emailPersonal: e.target.value })}
                    placeholder="personal@gmail.com"
                  />
                  {getError('emailPersonal') && (
                    <p className="text-xs text-destructive">{getError('emailPersonal')}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Teléfono (opcional)</Label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+51 999 999 999"
                />
              </div>

              {/* Roles actuales (solo al editar) */}
              {isEditing && user?.roles && user.roles.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Roles asignados
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {user.roles.map((r) => (
                      <Badge key={r.id} variant="secondary" className="gap-1.5 py-1">
                        {getRoleIcon(r.roleCode || '')}
                        {r.roleName}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para modificar roles, usa el botón de roles en la tabla de usuarios.
                  </p>
                </div>
              )}

              {/* Roles selection (solo al crear) */}
              {!isEditing && roles.length > 0 && (
                <div className="space-y-3">
                  <Label>Roles a asignar</Label>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => {
                      const isSelected = formData.selectedRoleIds.includes(role.id)
                      const isSuggested = detectionResult?.suggestedRoles.some(r => r.id === role.id)
                      return (
                        <label
                          key={role.id}
                          className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors
                            ${isSelected
                              ? 'bg-primary/10 border-primary'
                              : 'bg-muted/50 border-transparent hover:border-muted-foreground/20'}
                            ${isSuggested ? 'ring-2 ring-green-500/50' : ''}
                          `}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRole(role.id)}
                          />
                          {getRoleIcon(role.codigo)}
                          <span className="text-sm">{role.nombre}</span>
                          {isSuggested && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Detectado
                            </Badge>
                          )}
                        </label>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Los roles marcados como "Detectado" se asignarán basados en la información del sistema universitario
                  </p>

                  {/* Selector de facultad para MESA_PARTES */}
                  {roles.some(r => r.codigo === 'MESA_PARTES' && formData.selectedRoleIds.includes(r.id)) && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                      <Label className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <Building2 className="h-4 w-4" />
                        Facultad asignada para Mesa de Partes (opcional)
                      </Label>
                      <Select value={mesaPartesFacultadId || 'all'} onValueChange={(v) => setMesaPartesFacultadId(v === 'all' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las facultades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las facultades</SelectItem>
                          {facultades.map((fac) => (
                            <SelectItem key={fac.id} value={fac.id}>
                              {fac.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Si no selecciona una facultad, podrá gestionar proyectos de todas las facultades.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Estado y verificación */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="isActive" className="flex items-center gap-2 cursor-pointer">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Activo</p>
                      <p className="text-xs text-muted-foreground font-normal">Puede iniciar sesión</p>
                    </div>
                  </Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="isVerified" className="flex items-center gap-2 cursor-pointer">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Verificado</p>
                      <p className="text-xs text-muted-foreground font-normal">Email confirmado</p>
                    </div>
                  </Label>
                  <Switch
                    id="isVerified"
                    checked={formData.isVerified}
                    onCheckedChange={(checked) => setFormData({ ...formData, isVerified: checked })}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  {isEditing ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={isEditing ? 'Dejar vacío para mantener la actual' : 'Mínimo 8 caracteres'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {getError('password') && (
                  <p className="text-xs text-destructive">{getError('password')}</p>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!isEditing && !isValidated)}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
