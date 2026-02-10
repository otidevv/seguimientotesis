'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  User,
  Mail,
  Building2,
  GraduationCap,
  BookOpen,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  IdCard,
  Calendar,
  RefreshCw,
  Camera,
  Trash2
} from 'lucide-react'

interface StudentCareer {
  id: string
  codigoEstudiante: string
  carreraNombre: string
  facultadId: string
  facultad: {
    id: string
    nombre: string
  }
  creditosAprobados: number
  isActive: boolean
}

interface TeacherInfo {
  codigoDocente: string
  departamentoAcademico: string
  facultadNombre: string
}

interface ProfileData {
  carreras?: StudentCareer[]
  docenteInfo?: TeacherInfo
}

export default function PerfilPage() {
  const { user, isLoading: authLoading, hasRole, hasAnyRole } = useAuth()

  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Edit states
  const [emailPersonal, setEmailPersonal] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Avatar states
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return

      try {
        const response = await fetch('/api/auth/profile', {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setProfileData(data.data)
          setEmailPersonal(user.emailPersonal || '')
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    if (user) {
      loadProfileData()
      setEmailPersonal(user.emailPersonal || '')
      setAvatarUrl(user.avatarUrl || null)
    }
  }, [user])

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Use JPG, PNG, WebP o GIF')
      return
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es muy grande. Máximo 5MB')
      return
    }

    setIsUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/auth/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir la imagen')
      }

      setAvatarUrl(data.avatarUrl)
      toast.success('Foto de perfil actualizada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al subir la imagen')
    } finally {
      setIsUploadingAvatar(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle avatar delete
  const handleAvatarDelete = async () => {
    if (!avatarUrl) return

    setIsUploadingAvatar(true)

    try {
      const response = await fetch('/api/auth/avatar', {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar la imagen')
      }

      setAvatarUrl(null)
      toast.success('Foto de perfil eliminada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la imagen')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Handle profile update
  const handleSaveProfile = async () => {
    setIsSavingProfile(true)

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailPersonal }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar perfil')
      }

      toast.success('Perfil actualizado correctamente')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Handle password change
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar contraseña')
      }

      toast.success('Contraseña cambiada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar contraseña')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return '??'
    const first = user.nombres?.charAt(0) || ''
    const last = user.apellidoPaterno?.charAt(0) || ''
    return (first + last).toUpperCase()
  }

  // Get user type badges based on roles
  const getUserTypeBadges = () => {
    const badges = []
    if (hasRole('ESTUDIANTE')) {
      badges.push(<Badge key="estudiante" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Estudiante</Badge>)
    }
    if (hasRole('DOCENTE')) {
      badges.push(<Badge key="docente" className="bg-green-500/10 text-green-600 border-green-500/20">Docente</Badge>)
    }
    if (hasRole('EXTERNO')) {
      badges.push(<Badge key="externo" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Externo</Badge>)
    }
    return badges.length > 0 ? badges : null
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No se pudo cargar el perfil</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar con opciones de cambio */}
            <div className="relative group">
              <Avatar className="h-28 w-28 text-2xl border-4 border-background shadow-lg">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Foto de perfil" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              {/* Overlay con botones */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                      title="Cambiar foto"
                    >
                      <Camera className="h-4 w-4 text-white" />
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleAvatarDelete}
                        className="p-2 bg-red-500/70 rounded-full hover:bg-red-500 transition-colors"
                        title="Eliminar foto"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Input oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl font-semibold">
                  {user.nombres} {user.apellidoPaterno} {user.apellidoMaterno}
                </h2>
                {getUserTypeBadges()}
              </div>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                {user.roles?.map((role) => (
                  <Badge key={role.id} variant="outline">
                    <Shield className="h-3 w-3 mr-1" />
                    {role.nombre}
                  </Badge>
                ))}
              </div>

              {/* Botón cambiar foto (móvil) */}
              <div className="sm:hidden pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="gap-2"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  Cambiar foto
                </Button>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="academic" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Académico</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">Seguridad</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Tu información básica de identificación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Tipo de Documento</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <IdCard className="h-4 w-4 text-muted-foreground" />
                    <span>{user.tipoDocumento}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Número de Documento</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <IdCard className="h-4 w-4 text-muted-foreground" />
                    <span>{user.numeroDocumento}</span>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nombres</Label>
                  <div className="p-3 rounded-lg bg-muted">{user.nombres}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Apellido Paterno</Label>
                  <div className="p-3 rounded-lg bg-muted">{user.apellidoPaterno}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Apellido Materno</Label>
                  <div className="p-3 rounded-lg bg-muted">{user.apellidoMaterno}</div>
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Correo Institucional</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailPersonal">Correo Personal</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emailPersonal"
                      type="email"
                      placeholder="correo@personal.com"
                      value={emailPersonal}
                      onChange={(e) => setEmailPersonal(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Info Tab */}
        <TabsContent value="academic" className="space-y-4">
          {isLoadingProfile ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Sección Estudiante */}
              {hasRole('ESTUDIANTE') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Carreras Profesionales
                    </CardTitle>
                    <CardDescription>
                      Tus carreras registradas en UNAMAD
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {profileData?.carreras && profileData.carreras.length > 0 ? (
                        profileData.carreras.map((carrera, index) => (
                          <div
                            key={carrera.id}
                            className="p-4 rounded-lg border bg-card space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                <span className="font-medium">Carrera {index + 1}</span>
                              </div>
                              {carrera.isActive ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                  Activa
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-500/10 text-gray-600">
                                  Inactiva
                                </Badge>
                              )}
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Escuela Profesional</p>
                                <p className="font-medium">{carrera.carreraNombre}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Facultad</p>
                                <p className="font-medium">{carrera.facultad.nombre}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Código de Estudiante</p>
                                <p className="font-medium">{carrera.codigoEstudiante}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Créditos Aprobados</p>
                                <p className="font-medium">{carrera.creditosAprobados}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No hay carreras registradas</p>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <Button variant="outline" className="gap-2" disabled>
                          <RefreshCw className="h-4 w-4" />
                          Sincronizar con UNAMAD
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Actualiza tus datos académicos desde el sistema universitario
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sección Docente */}
              {hasRole('DOCENTE') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Información de Docente
                    </CardTitle>
                    <CardDescription>
                      Tu información como docente de UNAMAD
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {profileData?.docenteInfo ? (
                      <div className="p-4 rounded-lg border bg-card space-y-3">
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Código de Docente</p>
                            <p className="font-medium">{profileData.docenteInfo.codigoDocente}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Departamento Académico</p>
                            <p className="font-medium">{profileData.docenteInfo.departamentoAcademico}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-muted-foreground">Facultad</p>
                            <p className="font-medium">{profileData.docenteInfo.facultadNombre}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay información de docente registrada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Mensaje para usuarios sin info académica */}
              {!hasRole('ESTUDIANTE') && !hasRole('DOCENTE') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Información Académica
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay información académica disponible para este tipo de usuario</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Cambiar Contraseña
              </CardTitle>
              <CardDescription>
                Actualiza tu contraseña para mantener tu cuenta segura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña Actual</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Ingresa tu contraseña actual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repite la nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full sm:w-auto"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Cambiar Contraseña
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Información de Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Estado de la cuenta</p>
                    <p className="font-medium flex items-center gap-2">
                      {user.isActive ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          Activa
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          Inactiva
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Email verificado</p>
                    <p className="font-medium flex items-center gap-2">
                      {user.isVerified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Verificado
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          Pendiente
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
