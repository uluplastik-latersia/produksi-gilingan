import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { transactions, inventory } from './schema'
import { eq, and } from 'drizzle-orm'

const client = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN,
})

const db = drizzle(client)

async function recalculate() {
  console.log('🔄 Starting inventory recalculation...\n')

  try {
    const allTransactions = await db.select().from(transactions)
    
    const stockMap: Record<string, number> = {}

    for (const txn of allTransactions) {
      const key = `${txn.categoryId}_${txn.stockType}`
      if (!stockMap[key]) stockMap[key] = 0

      // 'in', 'production_in' add to stock
      if (txn.transactionType === 'in' || txn.transactionType === 'production_in') {
        stockMap[key] += txn.weight
      } 
      // 'out', 'production_out', 'mix_out' deduct from stock
      else {
        stockMap[key] -= txn.weight
      }
    }

    const allInventory = await db.select().from(inventory)
    
    for (const inv of allInventory) {
      const key = `${inv.categoryId}_${inv.stockType}`
      const calculatedStock = stockMap[key] || 0
      
      // Update if mismatch (floating point issues handled by rounding to 3 decimals to check mismatch)
      if (Math.abs(inv.currentStock - calculatedStock) > 0.0001) {
         console.log(`Mismatch found for Category ${inv.categoryId} (${inv.stockType}): DB=${inv.currentStock}, Calculated=${calculatedStock}`)
         await db.update(inventory)
            .set({ currentStock: calculatedStock, updatedAt: new Date() })
            .where(and(eq(inventory.categoryId, inv.categoryId), eq(inventory.stockType, inv.stockType)))
         console.log(`✅ Fixed stock to ${calculatedStock}`)
      }
    }

    console.log('\n🎉 Recalculation complete!')

  } catch (error) {
    console.error('❌ Failed to recalculate:', error)
  }
}

recalculate().catch(console.error)
