import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { getDb } from '../../src/db'
import { categories, inventory, transactions, oplosanBatches } from '../../src/db/schema'
import { eq, and, sql, inArray, desc } from 'drizzle-orm'

type Env = {
  Bindings: {
    VITE_TURSO_DATABASE_URL: string
    VITE_TURSO_AUTH_TOKEN: string
  }
}

const app = new Hono<Env>().basePath('/api')

// Helpers for validation
const safeNumber = (val: any) => {
  const num = Number(val)
  return isNaN(num) || num <= 0 ? null : num
}

// ---------------------------------------------------------
// GET /api/categories
// ---------------------------------------------------------
app.get('/categories', async (c) => {
  const db = getDb(c.env)
  try {
    const allCategories = await db.select().from(categories)
    return c.json({ success: true, data: allCategories })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ---------------------------------------------------------
// GET /api/inventory
// ---------------------------------------------------------
app.get('/inventory', async (c) => {
  const db = getDb(c.env)
  try {
    // We want to join inventory with categories to get a comprehensive view
    const allInventory = await db
      .select({
        id: inventory.id,
        categoryId: inventory.categoryId,
        categoryName: categories.name,
        moduleType: categories.moduleType,
        stockType: inventory.stockType,
        currentStock: inventory.currentStock,
        updatedAt: inventory.updatedAt,
      })
      .from(inventory)
      .leftJoin(categories, eq(inventory.categoryId, categories.id))

    return c.json({ success: true, data: allInventory })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ---------------------------------------------------------
// GET /api/transactions
// ---------------------------------------------------------
app.get('/transactions', async (c) => {
  const db = getDb(c.env)
  const moduleType = c.req.query('moduleType')
  const startDateStr = c.req.query('startDate')
  const endDateStr = c.req.query('endDate')
  
  try {
    let query = db
      .select({
        id: transactions.id,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        moduleType: categories.moduleType,
        stockType: transactions.stockType,
        transactionType: transactions.transactionType,
        weight: transactions.weight,
        notes: transactions.notes,
        createdAt: transactions.createdAt,
        batchId: transactions.batchId,
        batchName: oplosanBatches.batchName,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(oplosanBatches, eq(transactions.batchId, oplosanBatches.id))
      .$dynamic()

    if (moduleType) {
      if (moduleType === 'oplosan') {
        query = query.where(eq(transactions.transactionType, 'mix_out'))
      } else if (moduleType === 'sampah') {
        query = query.where(eq(transactions.transactionType, 'sampah'))
      } else {
        query = query.where(eq(categories.moduleType, moduleType))
      }
    }

    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr).getTime()
      const endTimestamp = new Date(endDateStr).getTime()
      
      // If we have a previous where clause, we need to AND it
      if (moduleType) {
        if (moduleType === 'oplosan') {
          query = db.select({...query._.selectedFields}).from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .leftJoin(oplosanBatches, eq(transactions.batchId, oplosanBatches.id))
            .where(and(
              eq(transactions.transactionType, 'mix_out'),
              sql`${transactions.createdAt} >= ${start}`,
              sql`${transactions.createdAt} <= ${endTimestamp}`
            ))
            .$dynamic()
        } else if (moduleType === 'sampah') {
          query = db.select({...query._.selectedFields}).from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .leftJoin(oplosanBatches, eq(transactions.batchId, oplosanBatches.id))
            .where(and(
              eq(transactions.transactionType, 'sampah'),
              sql`${transactions.createdAt} >= ${start}`,
              sql`${transactions.createdAt} <= ${endTimestamp}`
            ))
            .$dynamic()
        } else {
          query = db.select({...query._.selectedFields}).from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .leftJoin(oplosanBatches, eq(transactions.batchId, oplosanBatches.id))
            .where(and(
              eq(categories.moduleType, moduleType),
              sql`${transactions.createdAt} >= ${start}`,
              sql`${transactions.createdAt} <= ${endTimestamp}`
            ))
            .$dynamic()
        }
      } else {
        query = query.where(and(
          sql`${transactions.createdAt} >= ${start}`,
          sql`${transactions.createdAt} <= ${endTimestamp}`
        ))
      }
      
      const results = await query.orderBy(desc(transactions.createdAt))
      return c.json({ success: true, data: results })
    } else {
      const results = await query.orderBy(desc(transactions.createdAt)).limit(200)
      return c.json({ success: true, data: results })
    }
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ---------------------------------------------------------
// GET /api/transactions/summary
// ---------------------------------------------------------
app.get('/transactions/summary', async (c) => {
  const db = getDb(c.env)
  const startDateStr = c.req.query('startDate')
  const endDateStr = c.req.query('endDate')

  let startOfMonth: number;
  let endOfMonth: number;

  if (startDateStr && endDateStr) {
    startOfMonth = new Date(startDateStr).getTime()
    endOfMonth = new Date(endDateStr).getTime()
  } else {
    const year = parseInt(c.req.query('year') || new Date().getFullYear().toString())
    const month = parseInt(c.req.query('month') || (new Date().getMonth() + 1).toString())
    // Calculate unix timestamp bounds for the month
    startOfMonth = new Date(year, month - 1, 1).getTime()
    endOfMonth = new Date(year, month, 1).getTime()
  }

  try {
    const summary = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        moduleType: categories.moduleType,
        transactionType: transactions.transactionType,
        totalWeight: sql<number>`SUM(${transactions.weight})`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          sql`${transactions.createdAt} >= ${startOfMonth}`,
          sql`${transactions.createdAt} < ${endOfMonth}`
        )
      )
      .groupBy(transactions.categoryId, categories.name, categories.moduleType, transactions.transactionType)
      
    return c.json({ success: true, data: summary })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ---------------------------------------------------------
// POST /api/transactions/in
// ---------------------------------------------------------
app.post('/transactions/in', async (c) => {
  const db = getDb(c.env)
  try {
    const body = await c.req.json()
    const categoryId = parseInt(body.categoryId)
    const weight = safeNumber(body.weight)
    const stockType = body.stockType as 'raw' | 'processed'
    const notes = body.notes || ''

    if (!categoryId || !weight || !['raw', 'processed'].includes(stockType)) {
      return c.json({ success: false, error: 'Invalid input' }, 400)
    }

    // Must be transactional if we're updating and inserting
    await db.transaction(async (tx) => {
      // 1. Insert transaction record
      await tx.insert(transactions).values({
        categoryId,
        stockType,
        transactionType: 'in',
        weight,
        notes,
      })

      // Inventory updates are now handled automatically by SQLite Triggers.
    })

    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ---------------------------------------------------------
// POST /api/transactions/sampah
// ---------------------------------------------------------
app.post('/transactions/sampah', async (c) => {
  const db = getDb(c.env)
  try {
    const body = await c.req.json()
    const categoryId = parseInt(body.categoryId)
    const weight = safeNumber(body.weight)
    const stockType = 'raw' // Sampah always deducts from raw stock
    const notes = body.notes || ''

    if (!categoryId || !weight) {
      return c.json({ success: false, error: 'Invalid input' }, 400)
    }

    await db.transaction(async (tx) => {
      // Ensure there's enough raw stock (optional depending on business logic, but good practice)
      const rawStockRes = await tx
        .select()
        .from(inventory)
        .where(and(eq(inventory.categoryId, categoryId), eq(inventory.stockType, 'raw')))
        .limit(1)
        
      if (rawStockRes.length === 0 || rawStockRes[0].currentStock < weight) {
        throw new Error('Insufficient raw stock')
      }

      // 1. Insert transaction record
      await tx.insert(transactions).values({
        categoryId,
        stockType,
        transactionType: 'sampah',
        weight,
        notes,
      })
      // Inventory updates handled by SQLite Triggers
    })

    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ---------------------------------------------------------
// POST /api/transactions/production
// ---------------------------------------------------------
app.post('/transactions/production', async (c) => {
  const db = getDb(c.env)
  try {
    const body = await c.req.json()
    const categoryId = parseInt(body.categoryId)
    const rawWeight = safeNumber(body.rawWeight) // Deducted from raw
    const processedWeight = safeNumber(body.processedWeight) // Added to processed
    const notes = body.notes || ''

    if (!categoryId || !rawWeight || !processedWeight) {
      return c.json({ success: false, error: 'Invalid input' }, 400)
    }

    // Generate a unique reference group string (timestamp + random)
    const referenceGroup = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`

    await db.transaction(async (tx) => {
      // Ensure there's enough raw stock
      const rawStockRes = await tx
        .select()
        .from(inventory)
        .where(and(eq(inventory.categoryId, categoryId), eq(inventory.stockType, 'raw')))
        .limit(1)
        
      if (rawStockRes.length === 0 || rawStockRes[0].currentStock < rawWeight) {
        throw new Error('Insufficient raw stock')
      }

      // 1. Transaction: production_out (Raw)
      await tx.insert(transactions).values({
        categoryId,
        stockType: 'raw',
        transactionType: 'production_out',
        weight: rawWeight,
        referenceGroup,
        notes,
      })

      // 2. Transaction: production_in (Processed)
      await tx.insert(transactions).values({
        categoryId,
        stockType: 'processed',
        transactionType: 'production_in',
        weight: processedWeight,
        referenceGroup,
        notes,
      })

      // Inventory updates are now handled automatically by SQLite Triggers.
    })

    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ---------------------------------------------------------
// POST /api/transactions/oplosan
// ---------------------------------------------------------
app.post('/transactions/oplosan', async (c) => {
  const db = getDb(c.env)
  try {
    const body = await c.req.json()
    // items should be array of { categoryId: number, weight: number }
    const items = body.items as Array<{ categoryId: number; weight: number }>
    const batchName = body.batchName || `Batch ${new Date().toLocaleDateString()}`
    const notes = body.notes || ''

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ success: false, error: 'Invalid input items' }, 400)
    }

    let totalWeight = 0
    for (const item of items) {
      const w = safeNumber(item.weight)
      if (!item.categoryId || !w) {
        return c.json({ success: false, error: 'Invalid item data' }, 400)
      }
      totalWeight += w
    }

    await db.transaction(async (tx) => {
      // 1. Create oplosan batch
      const batchRes = await tx.insert(oplosanBatches).values({
        batchName,
        totalWeight,
        notes,
      }).returning({ id: oplosanBatches.id })
      
      const batchId = batchRes[0].id

      // 2. Process each item
      for (const item of items) {
        const catId = item.categoryId
        const w = Number(item.weight)

        // Check stock
        const procStockRes = await tx
          .select()
          .from(inventory)
          .where(and(eq(inventory.categoryId, catId), eq(inventory.stockType, 'processed')))
          .limit(1)

        if (procStockRes.length === 0 || procStockRes[0].currentStock < w) {
          throw new Error(`Insufficient processed stock for category ID ${catId}`)
        }

        // Insert mix_out transaction
        await tx.insert(transactions).values({
          categoryId: catId,
          stockType: 'processed',
          transactionType: 'mix_out',
          weight: w,
          batchId,
          notes: `Oplosan ${batchName}`,
        })

        // Inventory updates are now handled automatically by SQLite Triggers.
      }
    })

    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ---------------------------------------------------------
// Catch-all
// ---------------------------------------------------------
app.all('*', (c) => c.json({ success: false, error: 'Not found' }, 404))

export const onRequest = handle(app)
