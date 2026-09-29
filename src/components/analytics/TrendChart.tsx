import type { Study } from "../../types/research";
import { t } from "../../locales";

const colors = ["#6650d1", "#168a9a", "#ca7a25", "#3879b9"];

export function TrendChart({ studies }: { studies: Study[] }) {
  const pointsFor = (values: number[]) =>
    values.map((value, index) => `${index * 42},${90 - value}`).join(" ");

  return (
    <figure className="analytics-chart">
      <svg
        viewBox="0 0 294 100"
        role="img"
        aria-labelledby="trend-title trend-desc"
      >
        <title id="trend-title">{t("analytics.chartTitle")}</title>
        <desc id="trend-desc">{t("analytics.chartDescription")}</desc>
        {[20, 40, 60, 80].map((value) => (
          <g key={value}>
            <line x1="0" x2="294" y1={90 - value} y2={90 - value} />
            <text x="0" y={86 - value}>
              {value}
            </text>
          </g>
        ))}
        {studies.map((study, index) => (
          <polyline
            key={study.id}
            points={pointsFor(study.trend)}
            fill="none"
            stroke={colors[index % colors.length]}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <figcaption>
        <span>{t("analytics.periodOne")}</span>
        <span>{t("analytics.periodEight")}</span>
      </figcaption>
      <ul className="chart-legend" aria-label={t("analytics.series")}>
        {studies.map((study, index) => (
          <li key={study.id}>
            <span
              className="chart-swatch"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            {study.title}
          </li>
        ))}
      </ul>
      <table className="chart-data">
        <caption>{t("analytics.latestTable")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("analytics.study")}</th>
            <th scope="col">{t("analytics.period8")}</th>
          </tr>
        </thead>
        <tbody>
          {studies.map((study) => (
            <tr key={study.id}>
              <th scope="row">{study.title}</th>
              <td>{study.trend.at(-1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
