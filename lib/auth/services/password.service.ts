import bcrypt from 'bcrypt'
import { BCRYPT_SALT_ROUNDS } from '../constants'

/**
 * Hashear una contraseña usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
}

/**
 * Verificar si una contraseña coincide con el hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Validar fortaleza de contraseña
 * - Minimo 8 caracteres
 * - Al menos una mayuscula
 * - Al menos una minuscula
 * - Al menos un numero
 * - Al menos un caracter especial
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe tener al menos una letra mayúscula')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe tener al menos una letra minúscula')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe tener al menos un número')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('La contraseña debe tener al menos un carácter especial')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
