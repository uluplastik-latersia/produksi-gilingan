/// <reference types="node" />
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

// For scripts like seed.ts that run in Node and use process.env
const getStaticDb = () => {
  if (typeof process === 'undefined' || !process.env) return null;
  
  const url = process.env.VITE_TURSO_DATABASE_URL;
  const authToken = process.env.VITE_TURSO_AUTH_TOKEN;
  
  if (!url) return null;

  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

export const db = getStaticDb();

// For Cloudflare Pages Functions where env vars are passed per request
export const getDb = (env: { VITE_TURSO_DATABASE_URL: string; VITE_TURSO_AUTH_TOKEN?: string }) => {
  const client = createClient({
    url: env.VITE_TURSO_DATABASE_URL,
    authToken: env.VITE_TURSO_AUTH_TOKEN,
  })
  return drizzle(client, { schema })
}
