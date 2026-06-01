import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { transactions, oplosanBatches, inventory } from './schema'

const client = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN,
})

const db = drizzle(client)

async function clearData() {
  console.log('🧹 Starting database cleanup...\n')

  try {
    // 1. Delete all transactions
    console.log('Deleting transactions...')
    await db.delete(transactions)
    
    // 2. Delete all oplosan batches
    console.log('Deleting oplosan batches...')
    await db.delete(oplosanBatches)
    
    // 3. Reset all inventory stocks to 0
    console.log('Resetting inventory stocks to 0...')
    // Note: Drizzle ORM requires a where clause for updates, but since we want to update all,
    // we can either execute raw SQL or provide a dummy condition that is always true.
    // Or we can just delete inventory and re-run seed, but resetting stock is better.
    // Drizzle without where clause throws error by default in some drivers, 
    // but in LibSQL it might work. Let's just delete inventory and reseed.
    // Wait, seed script just inserts if not exists. If we delete inventory, seed will recreate them with 0 stock.
    console.log('Deleting inventory records (will be re-created by seed)...')
    await db.delete(inventory)
    
    console.log('\n✅ Database successfully cleaned up!')
    console.log('To recreate the inventory items with 0 stock, please run: npm run db:seed')
    
  } catch (error) {
    console.error('❌ Failed to clean database:', error)
  }
}

clearData().catch(console.error)
