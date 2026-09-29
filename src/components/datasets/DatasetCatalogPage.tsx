import { useMemo } from "react";
import { Filter, Search } from "lucide-react";
import { gql } from "../../api/graphql";
import { operations } from "../../api/operations";
import { ResearchSearch } from "../../ResearchSearch";
import { DatasetCard, DatasetCardSkeleton } from "./DatasetCard";
import type { CatalogSort } from "../../hooks/usePortalLocation";
import type { Study, UserRole } from "../../types/research";
import { t } from "../../locales";

export type CatalogFilters = {
  search: string;
  domain: string;
  sort: CatalogSort;
};

export function filterStudies(
  studies: Study[],
  filters: CatalogFilters,
): Study[] {
  return studies
    .filter(
      (study) =>
        (filters.domain === "All areas" || study.domain === filters.domain) &&
        `${study.title} ${study.description} ${study.id}`
          .toLowerCase()
          .includes(filters.search.trim().toLowerCase()),
    )
    .sort((left, right) => {
      if (filters.sort === "title")
        return left.title.localeCompare(right.title);
      if (filters.sort === "records") return right.records - left.records;
      return (
        new Date(right.updated).getTime() - new Date(left.updated).getTime()
      );
    });
}

export function DatasetCatalogPage({
  studies,
  loading,
  currentRole,
  token,
  filters,
  onFiltersChange,
  onClearFilters,
  onOpenDataset,
}: {
  studies: Study[];
  loading: boolean;
  currentRole: UserRole;
  token: string;
  filters: CatalogFilters;
  onFiltersChange: (filters: Partial<CatalogFilters>) => void;
  onClearFilters: () => void;
  onOpenDataset: (study: Study) => void;
}) {
  const filtered = useMemo(
    () => filterStudies(studies, filters),
    [studies, filters],
  );
  return (
    <>
      <div className="eyebrow">{t("catalog.eyebrow")}</div>
      <div className="page-title">
        <h1>{t("catalog.heading")}</h1>
        <p>{t("catalog.description")}</p>
      </div>
      {currentRole === "researcher" && token && (
        <ResearchSearch
          query={async (question) => {
            const result = await gql<{
              recommend: {
                mode: string;
                recommendations: { id: string; fields: string[] }[];
              };
            }>(operations.recommend, token, { question });
            return result.recommend;
          }}
          inspect={(id) => {
            const study = studies.find((item) => item.id === id);
            if (study) onOpenDataset(study);
          }}
        />
      )}
      <div className="toolbar">
        <div className="search">
          <Search size={19} aria-hidden="true" />
          <label className="visually-hidden" htmlFor="dataset-search">
            {t("catalog.searchLabel")}
          </label>
          <input
            id="dataset-search"
            placeholder={t("catalog.searchPlaceholder")}
            value={filters.search}
            onChange={(event) =>
              onFiltersChange({ search: event.target.value })
            }
          />
        </div>
        <div className="filter">
          <Filter size={17} aria-hidden="true" />
          <label className="visually-hidden" htmlFor="dataset-domain">
            {t("catalog.areaLabel")}
          </label>
          <select
            id="dataset-domain"
            value={filters.domain}
            onChange={(event) =>
              onFiltersChange({ domain: event.target.value })
            }
          >
            {[
              "All areas",
              "Cognition",
              "Wellbeing",
              "Imaging",
              "Intervention",
            ].map((area) => (
              <option key={area} value={area}>
                {area === "All areas"
                  ? t("catalog.allAreas")
                  : t(
                      area === "Cognition"
                        ? "catalog.areaCognition"
                        : area === "Wellbeing"
                          ? "catalog.areaWellbeing"
                          : area === "Imaging"
                            ? "catalog.areaImaging"
                            : "catalog.areaIntervention",
                    )}
              </option>
            ))}
          </select>
        </div>
        <div className="filter">
          <label className="visually-hidden" htmlFor="dataset-sort">
            {t("catalog.sortLabel")}
          </label>
          <select
            id="dataset-sort"
            value={filters.sort}
            onChange={(event) =>
              onFiltersChange({ sort: event.target.value as CatalogSort })
            }
          >
            <option value="recent">{t("catalog.sortRecent")}</option>
            <option value="title">{t("catalog.sortTitle")}</option>
            <option value="records">{t("catalog.sortRecords")}</option>
          </select>
        </div>
      </div>
      <p className="result-line" aria-live="polite">
        {loading
          ? t("catalog.loading")
          : t("catalog.resultCount", {
              shown: filtered.length,
              total: studies.length,
            })}
      </p>
      {loading ? (
        <div
          className="cards catalog"
          role="status"
          aria-label={t("catalog.loading")}
        >
          {[1, 2, 3, 4].map((key) => (
            <DatasetCardSkeleton key={key} />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="cards catalog">
          {filtered.map((study) => (
            <DatasetCard key={study.id} study={study} open={onOpenDataset} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>{t("catalog.emptyTitle")}</h2>
          <p>{t("catalog.emptyDescription")}</p>
          <button type="button" onClick={onClearFilters}>
            {t("common.clearFilters")}
          </button>
        </div>
      )}
    </>
  );
}
