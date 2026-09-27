"use client";

import { useMemo, useState } from "react";
import { localizedPublicDocument, type PublicDocument } from "@/lib/public-documents/registry";

export function DocumentSearchGrid({ documents, locale }: { documents: PublicDocument[]; locale: string }) {
  const [query, setQuery] = useState("");
  const fr = locale === "fr";
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale === "fr" ? "fr-CA" : "en-CA");
    if (!needle) return documents;
    return documents.filter((source) => {
      const doc = localizedPublicDocument(source.slug, locale) ?? source;
      return [doc.title, doc.summary, doc.purpose, doc.audience, doc.format, doc.language, doc.owner, doc.source, doc.unionBrand].filter(Boolean).some((value) => value!.toLocaleLowerCase(locale === "fr" ? "fr-CA" : "en-CA").includes(needle));
    });
  }, [documents, locale, query]);
  return <>
    <label className="mt-7 block text-sm font-medium" htmlFor="document-search">{fr ? "Rechercher" : "Search documents"}</label>
    <input id="document-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3" placeholder={fr ? "Essayez « convention collective »" : "Try “collective agreement”"} />
    <p className="mt-2 text-sm text-gray-500" aria-live="polite">{fr ? `${filtered.length} document${filtered.length === 1 ? "" : "s"}` : `${filtered.length} document${filtered.length === 1 ? "" : "s"}`}</p>
    {filtered.length === 0 ? <p className="mt-8 rounded-xl bg-slate-50 p-6 text-gray-600">{fr ? "Aucun document ne correspond à cette recherche." : "No documents match this search."}</p> : <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((source) => { const doc = localizedPublicDocument(source.slug, locale) ?? source; return <li key={doc.slug}>
        <a href={`/${locale}/documents/${doc.slug}`} className="group block h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-opseu-blue hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opseu-blue">
          <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2.5 py-1">{doc.format}</span><span className="rounded-full bg-slate-100 px-2.5 py-1">{doc.language.toUpperCase()}</span>{doc.unionBrand && <span className="rounded-full bg-blue-50 px-2.5 py-1">{doc.unionBrand}</span>}</div>
          <h2 className="mt-4 text-xl font-semibold text-opseu-dark group-hover:underline">{doc.title}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">{doc.summary}</p>
          <dl className="mt-4 space-y-1 text-xs text-gray-500"><div><dt className="inline font-semibold">{fr ? "Pour : " : "For: "}</dt><dd className="inline">{doc.audience}</dd></div><div><dt className="inline font-semibold">{fr ? "Source : " : "Source: "}</dt><dd className="inline">{doc.source}</dd></div><div><dt className="inline font-semibold">{fr ? "Hébergé par : " : "Hosted by: "}</dt><dd className="inline">{doc.hosting}</dd></div></dl>
        </a>
      </li>; })}
    </ul>}
  </>;
}
