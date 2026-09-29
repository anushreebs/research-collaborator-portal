import { useState } from "react";
import { t } from "./locales";
type Result = {
  mode: string;
  recommendations: { id: string; fields: string[] }[];
};
export function ResearchSearch({
  query,
  inspect,
}: {
  query: (question: string) => Promise<Result>;
  inspect: (id: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="research-search">
      <h3>{t("search.heading")}</h3>
      <p>{t("search.disclosure")}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setResult(null);
          try {
            setResult(await query(question));
          } catch (cause) {
            // Provider and network diagnostics stay out of the visitor-facing UI.
            void cause;
            setError(t("search.fallbackError"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="question">{t("search.label")}</label>
        <input
          id="question"
          required
          minLength={8}
          maxLength={500}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("search.placeholder")}
        />
        <button className="primary" type="submit" disabled={busy}>
          {busy ? t("search.busy") : t("search.submit")}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div aria-live="polite">
          <p>
            <b>
              {result.mode.startsWith("AI-assisted")
                ? t("search.modeAI")
                : result.mode.includes("AI unavailable")
                  ? t("search.modeFallback")
                  : t("search.modeDeterministic")}
            </b>
          </p>
          {!result.recommendations.length && <p>{t("search.empty")}</p>}
          {result.recommendations.map((r) => (
            <article key={r.id}>
              <h4>{r.id}</h4>
              <p>
                {result.mode.startsWith("AI-assisted")
                  ? t("search.rationaleAI", { fields: r.fields.join(" · ") })
                  : t("search.rationaleDeterministic", {
                      fields: r.fields.join(" · "),
                    })}
              </p>
              <p>{t("search.fields", { fields: r.fields.join(" · ") })}</p>
              <button
                type="button"
                className="secondary"
                onClick={() => inspect(r.id)}
              >
                {t("search.inspect")}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
