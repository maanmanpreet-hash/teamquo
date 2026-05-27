import { getDb } from './server/db.ts';

async function test() {
  const db = await getDb();
  console.log('DB connection:', db ? 'Connected' : 'Not connected');
  if (db) {
    console.log('DB object keys:', Object.keys(db));
  }
}

test().catch(console.error);
