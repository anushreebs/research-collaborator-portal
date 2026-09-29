import { test } from "node:test";
import assert from "node:assert/strict";
import { syntheticCsv } from "./synthetic.ts";
test("synthetic fixture matches advertised fields and record count", () => {
  const csv = syntheticCsv({
    fields: ["Participant ID", "Sleep duration"],
    records: 842,
  });
  const lines = csv.split("\n");
  assert.equal(lines.length, 843);
  assert.equal(lines[0], '"Participant ID","Sleep duration"');
  assert.match(lines[1], /SYN-0001/);
  assert.equal(lines.at(-1)?.split(",").length, 2);
});
