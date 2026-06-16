import 'dotenv/config'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN,
})

async function applyTriggers() {
  console.log('Applying SQLite Triggers...')

  // Drop existing triggers if any to ensure clean slate
  await client.execute(`DROP TRIGGER IF EXISTS trg_transactions_after_insert;`)
  await client.execute(`DROP TRIGGER IF EXISTS trg_transactions_after_delete;`)
  await client.execute(`DROP TRIGGER IF EXISTS trg_transactions_after_update;`)

  // Create AFTER INSERT trigger
  await client.execute(`
    CREATE TRIGGER trg_transactions_after_insert
    AFTER INSERT ON transactions
    BEGIN
        INSERT INTO inventory (category_id, stock_type, current_stock, updated_at)
        VALUES (
            NEW.category_id, 
            NEW.stock_type, 
            CASE 
                WHEN NEW.transaction_type IN ('in', 'production_in') THEN NEW.weight
                WHEN NEW.transaction_type IN ('out', 'production_out', 'mix_out', 'sampah') THEN -NEW.weight
                ELSE 0
            END,
            CAST(strftime('%s', 'now') AS INTEGER) * 1000
        )
        ON CONFLICT(category_id, stock_type) DO UPDATE SET 
            current_stock = inventory.current_stock + EXCLUDED.current_stock,
            updated_at = EXCLUDED.updated_at;
    END;
  `)

  // Create AFTER DELETE trigger
  await client.execute(`
    CREATE TRIGGER trg_transactions_after_delete
    AFTER DELETE ON transactions
    BEGIN
        UPDATE inventory
        SET current_stock = current_stock - 
            CASE 
                WHEN OLD.transaction_type IN ('in', 'production_in') THEN OLD.weight
                WHEN OLD.transaction_type IN ('out', 'production_out', 'mix_out', 'sampah') THEN -OLD.weight
                ELSE 0
            END,
            updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
        WHERE category_id = OLD.category_id AND stock_type = OLD.stock_type;
    END;
  `)

  // Create AFTER UPDATE trigger
  await client.execute(`
    CREATE TRIGGER trg_transactions_after_update
    AFTER UPDATE ON transactions
    BEGIN
        -- Revert OLD effect
        UPDATE inventory
        SET current_stock = current_stock - 
            CASE 
                WHEN OLD.transaction_type IN ('in', 'production_in') THEN OLD.weight
                WHEN OLD.transaction_type IN ('out', 'production_out', 'mix_out', 'sampah') THEN -OLD.weight
                ELSE 0
            END
        WHERE category_id = OLD.category_id AND stock_type = OLD.stock_type;

        -- Apply NEW effect
        INSERT INTO inventory (category_id, stock_type, current_stock, updated_at)
        VALUES (
            NEW.category_id, 
            NEW.stock_type, 
            CASE 
                WHEN NEW.transaction_type IN ('in', 'production_in') THEN NEW.weight
                WHEN NEW.transaction_type IN ('out', 'production_out', 'mix_out', 'sampah') THEN -NEW.weight
                ELSE 0
            END,
            CAST(strftime('%s', 'now') AS INTEGER) * 1000
        )
        ON CONFLICT(category_id, stock_type) DO UPDATE SET 
            current_stock = inventory.current_stock + EXCLUDED.current_stock,
            updated_at = EXCLUDED.updated_at;
    END;
  `)

  console.log('Triggers applied successfully!')
}

applyTriggers()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
