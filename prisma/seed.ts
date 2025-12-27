import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo store
  const store = await prisma.store.upsert({
    where: { slug: 'demo-store' },
    update: {},
    create: {
      name: 'Demo Hardware Store',
      slug: 'demo-store',
    },
  })
  console.log('✓ Store created:', store.name)

  // Create demo users
  const passwordHash = await bcrypt.hash('Demo123!', 10)

  const employee = await prisma.user.upsert({
    where: { email: 'employee@demo-store.com' },
    update: {},
    create: {
      email: 'employee@demo-store.com',
      passwordHash,
      name: 'Demo Employee',
      role: 'EMPLOYEE',
      storeId: store.id,
    },
  })
  console.log('✓ Employee created:', employee.email)

  const manager = await prisma.user.upsert({
    where: { email: 'manager@demo-store.com' },
    update: {},
    create: {
      email: 'manager@demo-store.com',
      passwordHash,
      name: 'Demo Manager',
      role: 'MANAGER',
      storeId: store.id,
    },
  })
  console.log('✓ Manager created:', manager.email)

  // Create demo products
  const products = [
    {
      sku: 'CMD-STRIPS-LG',
      name: 'Command Large Picture Hanging Strips (8-Pack)',
      description: 'Heavy duty damage-free strips. Holds up to 16 lbs.',
      category: 'hanging',
      price: 12.99,
      stock: 38,
      aisle: 'A3',
      bin: '13',
      tags: JSON.stringify(['no-damage', 'rental-friendly', 'no-tools']),
      attributes: JSON.stringify({ weight_capacity_lbs: 16, removable: true }),
    },
    {
      sku: 'MONKEY-HOOK-10',
      name: 'Monkey Hooks Picture Hangers (10-Pack)',
      description: 'Push into drywall. Holds up to 35 lbs. Leaves tiny hole.',
      category: 'hanging',
      price: 9.99,
      stock: 25,
      aisle: 'A3',
      bin: '14',
      tags: JSON.stringify(['no-tools', 'minimal-damage', 'drywall-only']),
      attributes: JSON.stringify({ weight_capacity_lbs: 35, requires_drill: false }),
    },
    {
      sku: 'DRYWALL-ANCHOR-50',
      name: 'Drywall Anchors Assorted (50-Pack)',
      description: 'Plastic expansion anchors. Requires drilling. Holds 20-75 lbs.',
      category: 'hardware',
      price: 12.99,
      stock: 30,
      aisle: 'B2',
      bin: '5',
      tags: JSON.stringify(['drilling-required', 'drywall', 'anchors']),
      attributes: JSON.stringify({ weight_capacity_lbs: 75, requires_drill: true }),
    },
    {
      sku: 'STUD-FINDER-DIG',
      name: 'Digital Stud Finder with LCD',
      description: 'Detects wood/metal studs, AC wiring, and pipes.',
      category: 'tools',
      price: 29.99,
      stock: 12,
      aisle: 'C1',
      bin: '22',
      tags: JSON.stringify(['tools', 'safety', 'detection']),
      attributes: JSON.stringify({ detects: ['wood studs', 'metal studs', 'AC wiring'] }),
    },
    {
      sku: 'VELCRO-STRIPS-15',
      name: 'Industrial Velcro Strips (15-Pack)',
      description: 'Heavy duty strips. Holds up to 10 lbs. Removable.',
      category: 'adhesives',
      price: 11.99,
      stock: 40,
      aisle: 'A4',
      bin: '3',
      tags: JSON.stringify(['no-damage', 'rental-friendly', 'adhesive']),
      attributes: JSON.stringify({ weight_capacity_lbs: 10, removable: true }),
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku_storeId: { sku: product.sku, storeId: store.id } },
      update: product,
      create: { ...product, storeId: store.id },
    })
  }
  console.log('✓ Products created:', products.length)

  console.log('✅ Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
