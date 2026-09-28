"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { intakeEntryHref } from "../resume-builder/trade-preselect";
import { TRADE_CAREER_FAMILIES } from "./trade-career-catalog";
import styles from "./resume-examples.module.css";

type CatalogFilter = "all" | "detailed" | "builder";

const FILTERS: { value: CatalogFilter; label: string }[] = [
  { value: "all", label: "All career families" },
  { value: "detailed", label: "Detailed guides" },
  { value: "builder", label: "New builder tracks" },
];

export function CatalogBrowser() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CatalogFilter>("all");

  const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
  const results = useMemo(() => TRADE_CAREER_FAMILIES.flatMap((family) => {
    const isDetailed = Boolean(family.guideHref);
    if (filter === "detailed" && !isDetailed) return [];
    if (filter === "builder" && isDetailed) return [];

    if (!normalizedQuery) return [{ family, visibleRoles: family.roles }];

    const familyMatch = [family.name, family.description, family.resumeFocus]
      .some((value) => value.toLocaleLowerCase("en-US").includes(normalizedQuery));
    const matchingRoles = family.roles.filter((role) => (
      role.toLocaleLowerCase("en-US").includes(normalizedQuery)
    ));

    if (!familyMatch && matchingRoles.length === 0) return [];
    return [{ family, visibleRoles: familyMatch ? family.roles : matchingRoles }];
  }), [filter, normalizedQuery]);

  const visibleRoleCount = results.reduce((total, result) => total + result.visibleRoles.length, 0);

  return (
    <section className={styles.catalogSection} id="career-catalog" aria-labelledby="catalog-title">
      <div className={styles.catalogIntro}>
        <div>
          <p className={styles.kicker}>BROWSE THE TRADE CAREER MAP</p>
          <h2 id="catalog-title">Find your lane. Then build for that job.</h2>
        </div>
        <p>
          Search a job title or browse by career family. Every family below is a live guided Resume Builder
          track. Seven also have a full trade-specific guide; the next seven are now inside the builder and
          will receive their own role pages piece by piece.
        </p>
      </div>

      <div className={styles.catalogControls}>
        <label className={styles.searchField}>
          <span>Search job titles</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try school bus driver, roofer, or apartment maintenance"
          />
        </label>
        <div className={styles.filterGroup} aria-label="Filter career families">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.resultCount} aria-live="polite">
        Showing <strong>{visibleRoleCount}</strong> job {visibleRoleCount === 1 ? "title" : "titles"} across <strong>{results.length}</strong> career {results.length === 1 ? "family" : "families"}.
      </p>

      {results.length > 0 ? (
        <div className={styles.familyGrid}>
          {results.map(({ family, visibleRoles }, index) => {
            const builderHref = intakeEntryHref(family.builderTrack);
            return (
              <article className={styles.familyCard} id={family.slug} key={family.slug}>
                <div className={styles.familyTopline}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{family.guideHref ? "DETAILED GUIDE + BUILDER" : "GUIDED BUILDER TRACK"}</strong>
                </div>
                <h3>{family.name}</h3>
                <p>{family.description}</p>
                <div className={styles.resumeFocus}>
                  <strong>What the resume should prove</strong>
                  <span>{family.resumeFocus}</span>
                </div>
                <div className={styles.roleHeading}>
                  <strong>{visibleRoles.length} {visibleRoles.length === 1 ? "job title" : "job titles"}</strong>
                  {normalizedQuery && visibleRoles.length !== family.roles.length ? <span>{family.roles.length} mapped in family</span> : null}
                </div>
                <ul className={styles.roleList}>
                  {visibleRoles.map((role) => <li key={role}>{role}</li>)}
                </ul>
                <div className={styles.familyActions}>
                  <Link
                    className={styles.builderLink}
                    href={builderHref}
                    data-analytics-event="cta_click"
                    data-location="resume_catalog_family"
                    data-destination={builderHref}
                    data-item={family.slug}
                  >
                    Start this resume <span aria-hidden="true">→</span>
                  </Link>
                  {family.guideHref ? (
                    <Link
                      className={styles.guideLink}
                      href={family.guideHref}
                      data-analytics-event="select_content"
                      data-location="resume_catalog_family"
                      data-destination={family.guideHref}
                      data-item={`${family.slug}_guide`}
                    >
                      Read detailed guide
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.noResults}>
          <h3>No exact match yet.</h3>
          <p>Try a broader title, vehicle, system, or trade family. You can also start the guided builder and type your exact target job.</p>
          <button type="button" onClick={() => { setQuery(""); setFilter("all"); }}>Clear search</button>
        </div>
      )}
    </section>
  );
}
