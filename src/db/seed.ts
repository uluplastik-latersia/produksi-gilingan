/**
 * Seed Script - PT. Ulu Plastik Latersia
 * =======================================
 * Populates the `categories` and `inventory` tables with initial data.
 * 
 * Usage: npx tsx src/db/seed.ts
 * 
 * This script is idempotent — it checks for existing data before inserting.
 */

/// <reference types="node" />
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { categories, inventory } from './schema'
import { eq, and } from 'drizzle-orm'

const client = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN,
})

const db = drizzle(client)

// ============================================
// CATEGORY DEFINITIONS
// ============================================

const GILINGAN_KERING_CATEGORIES = [
  'Metalis Nico',
  'Metalis Nico BR',
  'Metalis Nico BR1',
  'Metalis Nico BR2',
  'Afalan Rafia',
  'Lite Erwan',
  'Metalis Kopi',
  'Prongkalan Suwayuwo',
  'Prongkalan Peletan',
  'Prongkalan Sukorejo',
  'Packing Ulu',
  'Packing Sukorejo',
  'Packing Nasehudin',
  'Metalis BonCabe',
  'Lite Sakson',
  'Lite Tupel',
  'Rafia',
  'Metalis Nissin Tab',
  'Metalis Herman',
  'Lite Rasa No',
  'Pakcing Hitam Misrowi',
  'Packing Putih',
]

const GILINGAN_KECIL_CATEGORIES = [
  'Metalis Kopi',
  'PP Sablon',
  'Nilon',
  'Metalis BonCabe',
  'Metalis Sukorejo',
  'PP Indomie',
  'PP Roti',
  'PP Terasi',
  'PP Metalis Nissin',
  'Lite Tutup Gelas Yusuh',
  'Metalis Permen',
]

const GILINGAN_LUAR_CATEGORIES = [
  'Sruwol Sukorejo',
  'Metalis Nanang',
  'Metalis Dim',
]

const GILINGAN_BASAH_CATEGORIES = [
  'Srowol',
  'Wafer Oreo',
  'PP Sablon',
  'PE Putih',
  'PE Sablon',
  'HD Hitam',
  'HD Putih',
  'Nissin'
]

type ModuleType = 'kering' | 'kecil' | 'luar' | 'basah'

interface CategorySeed {
  name: string
  moduleType: ModuleType
}

async function seed() {
  console.log('🌱 Starting seed...\n')

  // Build flat list of all categories
  const allCategories: CategorySeed[] = [
    ...GILINGAN_KERING_CATEGORIES.map((name) => ({ name, moduleType: 'kering' as const })),
    ...GILINGAN_KECIL_CATEGORIES.map((name) => ({ name, moduleType: 'kecil' as const })),
    ...GILINGAN_LUAR_CATEGORIES.map((name) => ({ name, moduleType: 'luar' as const })),
    ...GILINGAN_BASAH_CATEGORIES.map((name) => ({ name, moduleType: 'basah' as const })),
  ]

  let categoriesInserted = 0
  let inventoryInserted = 0

  for (const cat of allCategories) {
    // Check if category already exists
    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.name, cat.name), eq(categories.moduleType, cat.moduleType)))
      .limit(1)

    let categoryId: number

    if (existing.length > 0) {
      categoryId = existing[0].id
      console.log(`  ⏭️  Category exists: [${cat.moduleType}] ${cat.name}`)
    } else {
      const result = await db.insert(categories).values({
        name: cat.name,
        moduleType: cat.moduleType,
      }).returning()
      categoryId = result[0].id
      categoriesInserted++
      console.log(`  ✅ Inserted category: [${cat.moduleType}] ${cat.name} (ID: ${categoryId})`)
    }

    // Create inventory rows for this category
    // Kering & Kecil: both "raw" and "processed" 
    // Luar & Basah: only "processed"
    const stockTypes: Array<'raw' | 'processed'> = 
      (cat.moduleType === 'luar' || cat.moduleType === 'basah') ? ['processed'] : ['raw', 'processed']

    for (const stockType of stockTypes) {
      const existingInv = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.categoryId, categoryId), eq(inventory.stockType, stockType)))
        .limit(1)

      if (existingInv.length === 0) {
        await db.insert(inventory).values({
          categoryId,
          stockType,
          currentStock: 0,
        })
        inventoryInserted++
      }
    }
  }

  console.log(`\n📊 Seed Summary:`)
  console.log(`   Categories inserted: ${categoriesInserted}`)
  console.log(`   Inventory rows inserted: ${inventoryInserted}`)
  console.log(`   Total categories: ${allCategories.length}`)
  console.log(`\n✅ Seed complete!`)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
