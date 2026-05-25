/**
 * Database Schema - PT. Ulu Plastik Latersia
 * ==========================================
 * Normalized relational schema for plastic recycling inventory management.
 * 
 * Design Decisions:
 * 1. `categories` stores all plastic types with their module assignment
 * 2. `inventory` has a UNIQUE(category_id, stock_type) constraint — each category
 *    can have at most one "raw" entry and one "processed" entry
 * 3. `transactions` is the immutable audit log — every stock mutation is recorded
 * 4. `oplosan_batches` groups mixing operations — each batch references multiple
 *    transaction records via `batch_id`
 * 5. All timestamps are stored as Unix milliseconds (INTEGER) for SQLite compatibility
 * 6. Weights are stored as REAL (floating point) in kilograms
 */

import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ============================================
// CATEGORIES
// ============================================
// Stores all plastic category types and their module assignment.
// Seeded at app init; rarely changes after that.
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  /** Which grinding module this category belongs to: kering | kecil | luar | basah */
  moduleType: text('module_type', { enum: ['kering', 'kecil', 'luar', 'basah'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
})

// ============================================
// INVENTORY
// ============================================
// Tracks the CURRENT stock weight for each category + stock type.
// This is the "live" balance — updated on every transaction.
// UNIQUE constraint: one row per (category_id, stock_type) pair.
export const inventory = sqliteTable('inventory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  /**
   * Stock type:
   * - "raw"       = Bahan Baku (raw material, only for kering & kecil)
   * - "processed"  = Hasil Gilingan (ground/processed output)
   */
  stockType: text('stock_type', { enum: ['raw', 'processed'] }).notNull(),
  /** Current stock weight in kilograms. Must never go negative. */
  currentStock: real('current_stock').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [
  uniqueIndex('idx_inventory_category_type').on(table.categoryId, table.stockType),
])

// ============================================
// TRANSACTIONS
// ============================================
// Immutable audit log of every stock movement.
// This is the source of truth — inventory.currentStock can be
// reconstructed by replaying transactions if needed.
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  stockType: text('stock_type', { enum: ['raw', 'processed'] }).notNull(),
  /**
   * Transaction types:
   * - "in"              = Stock added (bahan baku masuk / gilingan luar masuk)
   * - "out"             = Stock removed (manual adjustment / correction)
   * - "production_out"  = Raw material consumed for grinding
   * - "production_in"   = Processed output from grinding
   * - "mix_out"         = Processed stock consumed for oplosan (mixing)
   */
  transactionType: text('transaction_type', {
    enum: ['in', 'out', 'production_out', 'production_in', 'mix_out'],
  }).notNull(),
  /** Weight in kilograms (always positive — direction is determined by type) */
  weight: real('weight').notNull(),
  /** Optional note for context */
  notes: text('notes'),
  /** Links to oplosan_batches.id when transactionType = 'mix_out' */
  batchId: integer('batch_id').references(() => oplosanBatches.id),
  /**
   * Groups related transactions together.
   * E.g., a production event creates TWO transactions:
   * 1. production_out (raw material deducted)
   * 2. production_in (processed stock added)
   * Both share the same referenceGroup (a UUID or timestamp).
   */
  referenceGroup: text('reference_group'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
})

// ============================================
// OPLOSAN BATCHES
// ============================================
// Groups a set of mix_out transactions into a single mixing batch.
// One batch = one mixing operation where multiple processed stocks are combined.
export const oplosanBatches = sqliteTable('oplosan_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Optional batch name/label */
  batchName: text('batch_name'),
  /** Sum of all component weights in this batch */
  totalWeight: real('total_weight').notNull(),
  /** Optional notes about the mixing batch */
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
})

// ============================================
// TYPE EXPORTS
// ============================================
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Inventory = typeof inventory.$inferSelect
export type NewInventory = typeof inventory.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type OplosanBatch = typeof oplosanBatches.$inferSelect
export type NewOplosanBatch = typeof oplosanBatches.$inferInsert
