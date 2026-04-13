-- Agregar valor DESISTIDO al enum estado_autor
ALTER TYPE "estado_autor" ADD VALUE IF NOT EXISTS 'DESISTIDO';

-- Agregar valor DESISTIDA al enum estado_tesis
ALTER TYPE "estado_tesis" ADD VALUE IF NOT EXISTS 'DESISTIDA';
