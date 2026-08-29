import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let db: DatabaseSync | null = null;

/**
 * Open the read-only SQLite catalogue built by `npm run import`.
 * Single connection reused across the server process.
 */
export function getDb(): DatabaseSync {
  if (!db) {
    // `readOnly` is supported by the Node runtime but missing from the shipped
    // @types/node DatabaseSyncOptions, so cast around the stale type.
    const options = { readOnly: true } as unknown as ConstructorParameters<
      typeof DatabaseSync
    >[1];
    db = new DatabaseSync(path.join(process.cwd(), "data", "library.db"), options);
  }
  return db;
}
