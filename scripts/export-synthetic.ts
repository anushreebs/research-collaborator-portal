import { mkdirSync, writeFileSync } from "node:fs";
import { db } from "../server/index.ts";
import { syntheticCsv } from "../server/synthetic.ts";
mkdirSync("synthetic", { recursive: true });
for (const study of (await db.query("SELECT id,fields,records FROM studies"))
  .rows)
  writeFileSync(`synthetic/${study.id}.csv`, syntheticCsv(study));
await db.close();
