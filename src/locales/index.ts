import en from "./en.json";

type LocaleTree = typeof en;
type LeafKeys<T, Prefix extends string = ""> = {
  [Key in keyof T & string]: T[Key] extends string
    ? `${Prefix}${Key}`
    : T[Key] extends Record<string, unknown>
      ? LeafKeys<T[Key], `${Prefix}${Key}.`>
      : never;
}[keyof T & string];

export type MessageKey = LeafKeys<LocaleTree>;
export type MessageValues = Record<string, string | number>;

function readMessage(key: MessageKey): string {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[part];
  }, en);
  if (typeof value !== "string")
    throw new Error(`Missing English message: ${key}`);
  return value;
}

/** Typed English copy with named interpolation and one/other plural forms. */
export function t(key: MessageKey, values: MessageValues = {}): string {
  const message = readMessage(key).replace(
    /\{\{([a-zA-Z][a-zA-Z0-9_]*),\s*plural,\s*one\s*\{([^{}]*)\}\s*other\s*\{([^{}]*)\}\s*\}\}/g,
    (_whole, name: string, one: string, other: string) => {
      const count = Number(values[name] ?? 0);
      return (count === 1 ? one : other).replaceAll("#", String(count));
    },
  );
  return message.replace(
    /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g,
    (whole, name: string) => (name in values ? String(values[name]) : whole),
  );
}
