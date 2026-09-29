// Reproducible synthetic fixtures, never imported participant data.
export function syntheticCsv(study: { fields: string[]; records: number }) {
  const quote = (v: string) => `"${v.replaceAll('"', '""')}"`;
  return [
    study.fields.map(quote).join(","),
    ...Array.from({ length: study.records }, (_, i) =>
      study.fields
        .map((field, j) =>
          quote(
            /ID/.test(field)
              ? `SYN-${String(i + 1).padStart(4, "0")}`
              : /period/i.test(field)
                ? `2026-Q${(i % 4) + 1}`
                : /modality/i.test(field)
                  ? "synthetic-MRI"
                  : /quality|completion/i.test(field)
                    ? "synthetic-pass"
                    : String(20 + ((i * 7 + j * 3) % 80)),
          ),
        )
        .join(","),
    ),
  ].join("\n");
}
