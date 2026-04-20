import { execSync } from 'child_process'

console.log('Ejecutando todos los seeds...\n')

try {
  console.log('>>> Ejecutando seed-admin...')
  execSync('npx tsx prisma/seed-admin.ts', { stdio: 'inherit' })

  console.log('>>> Ejecutando seed-users...')
  execSync('npx tsx prisma/seed-users.ts', { stdio: 'inherit' })

  console.log('>>> Ejecutando seed-academic-calendar...')
  execSync('npx tsx prisma/seed-academic-calendar.ts', { stdio: 'inherit' })

  console.log('\n✓ Todos los seeds ejecutados correctamente')
} catch (e) {
  console.error('Error ejecutando seeds:', e)
  process.exit(1)
}
