// Applies supabase/migrations/0004_canonical_alias.sql to the live DB.
//
// This is a DDL migration (ALTER TABLE ... ADD COLUMN), which the PostgREST
// service-role client cannot run — so unlike the DML apply-* scripts it opens a
// direct Postgres connection using SUPABASE_PROJECT_ID + SUPABASE_PASSWORD.
// Idempotent (add column if not exists); a second run is a no-op.
//
// Run: node --env-file=.env.local scripts/apply-0004-canonical-alias.mjs

import pg from "pg";
const { Client } = pg;

const projectId = process.env.SUPABASE_PROJECT_ID;
const password = process.env.SUPABASE_PASSWORD;
if (!projectId || !password) {
  console.error("Missing SUPABASE_PROJECT_ID or SUPABASE_PASSWORD in env.");
  process.exit(1);
}
const pw = encodeURIComponent(password);

// Region is unknown, so sweep every Supabase pooler region across both the
// aws-0 and aws-1 host prefixes. A wrong region fails fast: the host either
// doesn't resolve (ENOTFOUND) or the pooler rejects the tenant immediately.
// The pooler user is postgres.<projectId>; port 5432 is the session pooler
// (supports DDL). The direct host is tried first in case IPv4/DNS is available.
const REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2", "ca-central-1",
  "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2",
  "eu-north-1", "sa-east-1", "ap-south-1", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1", "ap-northeast-2",
];
const candidates = [
  `postgresql://postgres:${pw}@db.${projectId}.supabase.co:5432/postgres`,
];
for (const prefix of ["aws-0", "aws-1"]) {
  for (const region of REGIONS) {
    candidates.push(
      `postgresql://postgres.${projectId}:${pw}@${prefix}-${region}.pooler.supabase.com:5432/postgres`,
    );
  }
}

for (const cs of candidates) {
  const label = cs.replace(/:[^:@]*@/, ":<pw>@");
  const client = new Client({
    connectionString: cs,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    console.log("connected via", label);
    await client.query(`alter table works add column if not exists canonical_title  text;`);
    await client.query(`alter table works add column if not exists canonical_author text;`);
    const { rows } = await client.query(
      `select column_name from information_schema.columns
        where table_name = 'works' and column_name like 'canonical%'
        order by column_name;`,
    );
    console.log("canonical columns now present:", rows.map((r) => r.column_name).join(", "));
    await client.end();
    console.log("done.");
    process.exit(0);
  } catch (e) {
    console.log("  x", label, "->", e.message);
    try { await client.end(); } catch {}
  }
}
console.error("Could not connect to the database on any candidate host.");
process.exit(1);
