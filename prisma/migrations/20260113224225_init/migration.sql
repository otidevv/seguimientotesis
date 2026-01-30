-- CreateEnum
CREATE TYPE "tipo_usuario" AS ENUM ('ESTUDIANTE', 'DOCENTE', 'EXTERNO');

-- CreateEnum
CREATE TYPE "tipo_documento" AS ENUM ('DNI', 'CARNET_EXTRANJERIA', 'PASAPORTE', 'OTRO');

-- CreateEnum
CREATE TYPE "audit_status" AS ENUM ('SUCCESS', 'FAILURE', 'PENDING');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tipo_documento" "tipo_documento" NOT NULL DEFAULT 'DNI',
    "numero_documento" VARCHAR(20) NOT NULL,
    "username" VARCHAR(50),
    "email" TEXT NOT NULL,
    "email_personal" TEXT,
    "password_hash" TEXT NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellido_paterno" VARCHAR(100) NOT NULL,
    "apellido_materno" VARCHAR(100) NOT NULL,
    "tipo_usuario" "tipo_usuario" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(45),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "external_data_cache" JSONB,
    "external_data_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_careers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "codigo_estudiante" VARCHAR(20) NOT NULL,
    "carrera_nombre" VARCHAR(150) NOT NULL,
    "facultad_id" TEXT NOT NULL,
    "creditos_aprobados" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_careers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_info" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "codigo_docente" VARCHAR(20) NOT NULL,
    "departamento_academico" VARCHAR(150) NOT NULL,
    "facultad_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculties" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "facultad_id" TEXT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_modules" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "icono" VARCHAR(50),
    "ruta" VARCHAR(200),
    "orden" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "color" VARCHAR(20),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "custom_permissions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "context_type" VARCHAR(50),
    "context_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "assigned_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "device_info" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "device_id" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" VARCHAR(100) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" TEXT,
    "description" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "request_path" VARCHAR(500),
    "request_method" VARCHAR(10),
    "status" "audit_status" NOT NULL DEFAULT 'SUCCESS',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "identifier" VARCHAR(255) NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 1,
    "window_start" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_numero_documento_key" ON "users"("numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_numero_documento_idx" ON "users"("numero_documento");

-- CreateIndex
CREATE INDEX "users_tipo_documento_numero_documento_idx" ON "users"("tipo_documento", "numero_documento");

-- CreateIndex
CREATE INDEX "users_tipo_usuario_idx" ON "users"("tipo_usuario");

-- CreateIndex
CREATE INDEX "users_is_active_is_verified_idx" ON "users"("is_active", "is_verified");

-- CreateIndex
CREATE INDEX "student_careers_user_id_idx" ON "student_careers"("user_id");

-- CreateIndex
CREATE INDEX "student_careers_facultad_id_idx" ON "student_careers"("facultad_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_careers_user_id_codigo_estudiante_key" ON "student_careers"("user_id", "codigo_estudiante");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_info_user_id_key" ON "teacher_info"("user_id");

-- CreateIndex
CREATE INDEX "teacher_info_facultad_id_idx" ON "teacher_info"("facultad_id");

-- CreateIndex
CREATE UNIQUE INDEX "faculties_nombre_key" ON "faculties"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "faculties_codigo_key" ON "faculties"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "schools_codigo_key" ON "schools"("codigo");

-- CreateIndex
CREATE INDEX "schools_facultad_id_idx" ON "schools"("facultad_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_modules_nombre_key" ON "system_modules"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "system_modules_codigo_key" ON "system_modules"("codigo");

-- CreateIndex
CREATE INDEX "system_modules_parent_id_idx" ON "system_modules"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "roles_codigo_key" ON "roles"("codigo");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_module_id_idx" ON "role_permissions"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_module_id_key" ON "role_permissions"("role_id", "module_id");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "user_roles_context_type_context_id_idx" ON "user_roles"("context_type", "context_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_context_type_context_id_key" ON "user_roles"("user_id", "role_id", "context_type", "context_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "password_resets"("user_id");

-- CreateIndex
CREATE INDEX "password_resets_token_hash_idx" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "rate_limits_identifier_endpoint_idx" ON "rate_limits"("identifier", "endpoint");

-- CreateIndex
CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits"("window_start");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_identifier_endpoint_window_start_key" ON "rate_limits"("identifier", "endpoint", "window_start");

-- AddForeignKey
ALTER TABLE "student_careers" ADD CONSTRAINT "student_careers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_careers" ADD CONSTRAINT "student_careers_facultad_id_fkey" FOREIGN KEY ("facultad_id") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_info" ADD CONSTRAINT "teacher_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_info" ADD CONSTRAINT "teacher_info_facultad_id_fkey" FOREIGN KEY ("facultad_id") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_facultad_id_fkey" FOREIGN KEY ("facultad_id") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_modules" ADD CONSTRAINT "system_modules_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "system_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "system_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
