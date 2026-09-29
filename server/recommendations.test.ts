import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fallback,
  validateRecommendations,
  recommend,
} from "./recommendations.ts";
const catalog = [
  {
    id: "one",
    title: "Sleep study",
    description: "Synthetic sleep",
    domain: "Wellbeing",
    fields: ["Sleep duration", "Energy score"],
  },
  {
    id: "two",
    title: "Cognition",
    description: "Synthetic reasoning",
    domain: "Cognition",
    fields: ["Reasoning score", "Sleep quality"],
  },
];
test("fallback finds actual fields, limits results, and abstains without support", () => {
  const result = fallback("sleep and reasoning", catalog);
  assert.equal(result.length, 2);
  assert.ok(
    result.every((r) =>
      catalog.some(
        (s) => s.id === r.id && r.fields.every((f) => s.fields.includes(f)),
      ),
    ),
  );
  assert.deepEqual(fallback("genetics sequencing", catalog), []);
});
test("validation rejects invented IDs, fields, duplicate IDs and excessive results", () => {
  for (const value of [
    [{ id: "invented", fields: ["Sleep duration"] }],
    [{ id: "one", fields: ["genome"] }],
    [{ id: "one", fields: [] }],
    [
      { id: "one", fields: ["Sleep duration"] },
      { id: "one", fields: ["Sleep duration"] },
    ],
    [{}, {}, {}],
  ])
    assert.throws(() => validateRecommendations(value, catalog));
  assert.match(
    validateRecommendations(
      [
        {
          id: "one",
          fields: ["Sleep duration"],
          rationale: "unsupported cure",
        },
      ],
      catalog,
    )[0].rationale,
    /Sleep duration/,
  );
  assert.ok(
    !validateRecommendations(
      [
        {
          id: "one",
          fields: ["Sleep duration"],
          rationale: "unsupported cure",
        },
      ],
      catalog,
    )[0].rationale.includes("cure"),
  );
});
test("no key fallback never calls a provider; provider failures fall back safely", async () => {
  const key = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_MODEL;
  try {
    delete process.env.OPENAI_API_KEY;
    let calls = 0;
    const call = (async () => {
      calls++;
      throw new Error("offline");
    }) as typeof fetch;
    assert.equal(
      (await recommend("sleep patterns", catalog, call)).recommendations.length,
      2,
    );
    assert.equal(calls, 0);
    process.env.OPENAI_API_KEY = "test";
    process.env.OPENAI_MODEL = "test";
    assert.match(
      (await recommend("sleep patterns", catalog, call)).mode,
      /output rejected/,
    );
    assert.equal(calls, 1);
    await assert.rejects(() => recommend("x", catalog, call));
  } finally {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
    if (model === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = model;
  }
});
test("provider receives metadata only and ungrounded output falls back", async () => {
  const key = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = "test";
  process.env.OPENAI_MODEL = "test";
  try {
    const records = [
      { ...catalog[0], participantRecords: ["never-send"], csv: "never-send" },
    ];
    let sent = "";
    const call = (async (_url, init) => {
      sent = String(init?.body);
      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    recommendations: [
                      { id: "invented", fields: ["Sleep duration"] },
                    ],
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    const result = await recommend("sleep patterns", records, call);
    assert.ok(!sent.includes("never-send"));
    assert.match(result.mode, /output rejected/);
    assert.equal(result.recommendations[0].id, "one");
  } finally {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
    if (model === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = model;
  }
});
