"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { MEMBER_EMPLOYMENT_FIELDS } from "@/lib/data-workbench/types";
import type { DataDataset, DataImportRun, StagedPreviewRow } from "@/lib/data-workbench/types";
import type { WorkbenchField, WorkbenchMapping } from "@/lib/db/schema/data-workbench";

type ImportDetail = { run: DataImportRun; dataset: DataDataset; totalRows: number; rows: StagedPreviewRow[] };
type PersonRow = { id: string; displayName: string; profile: Record<string, unknown>; assignments: Array<Record<string, unknown>> };
type Tab = "datasets" | "imports" | "records" | "reports";

const inputClass = "min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm";
const idFromLabel = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").replace(/^[^a-zA-Z]+/, "").slice(0, 50).toLowerCase();

export function DataWorkbench() {
  const t = useTranslations("dataWorkbench");
  const [tab, setTab] = useState<Tab>("datasets");
  const [datasets, setDatasets] = useState<DataDataset[]>([]);
  const [imports, setImports] = useState<DataImportRun[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [mapping, setMapping] = useState<WorkbenchMapping>({});
  const [mappingDirty, setMappingDirty] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"table" | "member_employment">("member_employment");
  const [fields, setFields] = useState<WorkbenchField[]>([]);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<WorkbenchField["type"]>("text");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [personHistory, setPersonHistory] = useState<unknown>(null);
  const [records, setRecords] = useState<Array<{ rowIndex: number; values: Record<string, unknown> }>>([]);

  const request = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? t("requestFailed"));
    return body as T;
  }, [t]);

  const refresh = useCallback(async () => {
    const [datasetResult, importResult, peopleResult] = await Promise.all([
      request<{ datasets: DataDataset[] }>("/api/data/datasets"),
      request<{ imports: DataImportRun[] }>("/api/data/imports"),
      request<{ people: PersonRow[] }>("/api/data/records/people"),
    ]);
    setDatasets(datasetResult.datasets);
    setImports(importResult.imports);
    setPeople(peopleResult.people);
    if (!selectedDataset && datasetResult.datasets[0]) setSelectedDataset(datasetResult.datasets[0].id);
  }, [request, selectedDataset]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      request<{ datasets: DataDataset[] }>("/api/data/datasets"),
      request<{ imports: DataImportRun[] }>("/api/data/imports"),
      request<{ people: PersonRow[] }>("/api/data/records/people"),
    ]).then(([datasetResult, importResult, peopleResult]) => {
      if (cancelled) return;
      setDatasets(datasetResult.datasets);
      setImports(importResult.imports);
      setPeople(peopleResult.people);
      setSelectedDataset((current) => current || datasetResult.datasets[0]?.id || "");
    }).catch((error: unknown) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : t("requestFailed"));
    });
    return () => { cancelled = true; };
  }, [request, t]);

  const loadImport = useCallback(async (id: string, requestedPage = 0) => {
    const response = await request<ImportDetail>(`/api/data/imports/${id}?offset=${requestedPage * 100}&limit=100`);
    setDetail(response);
    setMapping(response.run.mapping);
    setMappingDirty(false);
    setSelectedRows([]);
    setPage(requestedPage);
  }, [request]);

  const targets = useMemo(() => {
    if (!detail) return [];
    if (detail.dataset.kind === "member_employment") return [
      ...MEMBER_EMPLOYMENT_FIELDS.map((field) => ({ id: field.id, label: t(`fields.${field.id}`) })),
      ...detail.dataset.fields.map((field) => ({ id: field.id, label: field.label })),
    ];
    return detail.dataset.fields.map((field) => ({ id: field.id, label: field.label }));
  }, [detail, t]);

  async function createDataset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const created = await request<{ dataset: DataDataset }>("/api/data/datasets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, kind, fields }),
      });
      setName(""); setDescription(""); setFields([]); setSelectedDataset(created.dataset.id);
      await refresh();
      setMessage(t("datasetCreated"));
    } catch (error) { setMessage(error instanceof Error ? error.message : t("requestFailed")); }
    finally { setBusy(false); }
  }

  async function startImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !selectedDataset) return;
    setBusy(true); setMessage("");
    try {
      const body = new FormData(); body.set("file", file); body.set("datasetId", selectedDataset);
      const result = await request<{ run: DataImportRun }>("/api/data/imports", { method: "POST", body });
      await loadImport(result.run.id);
      setTab("imports"); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : t("requestFailed")); }
    finally { setBusy(false); }
  }

  async function saveMapping() {
    if (!detail) return;
    setBusy(true); setMessage("");
    try {
      const result = await request<ImportDetail>(`/api/data/imports/${detail.run.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mapping", mapping }) });
      setDetail(result); setMapping(result.run.mapping); setMappingDirty(false); setMessage(t("mappingSaved")); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : t("requestFailed")); }
    finally { setBusy(false); }
  }

  async function decideRows(decision: "accept" | "exclude", indexes = selectedRows) {
    if (!detail || indexes.length === 0) return;
    setBusy(true); setMessage("");
    try {
      await request(`/api/data/imports/${detail.run.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decisions", rowIndexes: indexes, decision }) });
      await loadImport(detail.run.id, page);
    } catch (error) { setMessage(error instanceof Error ? error.message : t("requestFailed")); }
    finally { setBusy(false); }
  }

  async function publish() {
    if (!detail) return;
    setBusy(true); setMessage("");
    try {
      const result = await request<{ publication: { acceptedCount: number; heldCount: number; status: string } }>(`/api/data/imports/${detail.run.id}/publish`, { method: "POST" });
      setMessage(t("published", { accepted: result.publication.acceptedCount, held: result.publication.heldCount }));
      await loadImport(detail.run.id, page); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : t("requestFailed")); }
    finally { setBusy(false); }
  }

  async function showHistory(personId: string) {
    setBusy(true); setMessage("");
    try { setPersonHistory((await request<{ history: unknown }>(`/api/data/records/people/${personId}/history`)).history); }
    catch (error) { setMessage(error instanceof Error ? error.message : t("requestFailed")); }
    finally { setBusy(false); }
  }

  async function showRecords(datasetId: string) {
    setSelectedDataset(datasetId); setBusy(true); setMessage("");
    try { const result = await request<{ records: typeof records }>(`/api/data/datasets/${datasetId}/records`); setRecords(result.records); }
    catch (error) { setMessage(error instanceof Error ? error.message : t("requestFailed")); }
    finally { setBusy(false); }
  }

  function addField() {
    const id = idFromLabel(fieldLabel);
    if (!id || fields.some((field) => field.id === id)) return;
    setFields((current) => [...current, { id, label: fieldLabel.trim(), type: fieldType, access: "officer" }]);
    setFieldLabel("");
  }

  const tabLabels: Record<Tab, string> = { datasets: t("datasets"), imports: t("imports"), records: t("records"), reports: t("reports") };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-opseu-blue">{t("eyebrow")}</p>
        <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
        <p className="max-w-3xl text-gray-700">{t("intro")}</p>
      </header>
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2" role="tablist" aria-label={t("sections")}>
        {(Object.keys(tabLabels) as Tab[]).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={`min-h-11 rounded-md px-4 text-sm font-medium ${tab === item ? "bg-opseu-blue text-white" : "bg-gray-100 text-opseu-dark hover:bg-gray-200"}`} onClick={() => { setTab(item); setMessage(""); }}>{tabLabels[item]}</button>)}
      </div>
      {message && <p role="status" className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">{message}</p>}

      {tab === "datasets" && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <Card density="compact" className="space-y-4">
          <CardTitle>{t("createDataset")}</CardTitle>
          <form className="space-y-4" onSubmit={createDataset}>
            <label className="block space-y-1 text-sm"><span>{t("datasetName")}</span><input className={inputClass} required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="block space-y-1 text-sm"><span>{t("description")}</span><textarea className="w-full rounded-md border border-gray-300 p-3 text-sm" rows={2} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <label className="block space-y-1 text-sm"><span>{t("datasetType")}</span><select className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="member_employment">{t("memberEmployment")}</option><option value="table">{t("generalTable")}</option></select></label>
            {kind === "table" && <fieldset className="space-y-3 rounded-md border border-gray-200 p-3"><legend className="px-1 text-sm font-semibold">{t("customFields")}</legend><div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]"><input className={inputClass} placeholder={t("fieldLabel")} value={fieldLabel} onChange={(event) => setFieldLabel(event.target.value)} /><select className={inputClass} value={fieldType} onChange={(event) => setFieldType(event.target.value as typeof fieldType)}><option value="text">{t("textType")}</option><option value="number">{t("numberType")}</option><option value="date">{t("dateType")}</option><option value="boolean">{t("booleanType")}</option></select><Button type="button" variant="outline" onClick={addField}>{t("addField")}</Button></div><ul className="space-y-1 text-sm text-gray-700">{fields.map((field) => <li key={field.id} className="flex items-center justify-between">{field.label} <button type="button" className="text-red-700 underline" onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))}>{t("remove")}</button></li>)}</ul></fieldset>}
            <Button type="submit" disabled={busy || (kind === "table" && fields.length === 0)}>{t("create")}</Button>
          </form>
        </Card>
        <Card density="compact" className="space-y-4">
          <CardTitle>{t("uploadTitle")}</CardTitle>
          <p className="text-sm text-gray-700">{t("uploadHelp")}</p>
          {datasets.length === 0 ? <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">{t("noDatasets")}</p> : <form onSubmit={startImport} className="space-y-4">
            <label className="block space-y-1 text-sm"><span>{t("chooseDataset")}</span><select className={inputClass} value={selectedDataset} onChange={(event) => setSelectedDataset(event.target.value)}>{datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}</select></label>
            <label className="block space-y-1 text-sm"><span>{t("chooseFile")}</span><input className="block min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
            <Button type="submit" disabled={busy || !file}>{t("inspectFile")}</Button>
          </form>}
          <ul className="divide-y divide-gray-200">{datasets.map((dataset) => <li className="py-3" key={dataset.id}><p className="font-semibold text-opseu-dark">{dataset.name}</p><p className="text-sm text-gray-600">{dataset.kind === "table" ? t("generalTable") : t("memberEmployment")} · {dataset.description || t("noDescription")}</p></li>)}</ul>
        </Card>
      </div>}

      {tab === "imports" && <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Card density="compact" className="space-y-3"><CardTitle>{t("recentImports")}</CardTitle>{imports.length === 0 ? <p className="text-sm text-gray-600">{t("noImports")}</p> : imports.map((item) => <button key={item.id} type="button" className={`block w-full rounded-md border p-3 text-left ${detail?.run.id === item.id ? "border-opseu-blue bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`} onClick={() => void loadImport(item.id)}><span className="block truncate font-medium">{item.fileName}</span><span className="mt-1 block text-xs text-gray-600">{item.rowCount} · {t(`status.${item.status}`)}</span></button>)}</Card>
        {detail ? <Card density="compact" className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{detail.run.fileName}</CardTitle><p className="mt-1 text-sm text-gray-600">{t("importSummary", { rows: detail.totalRows, sheet: detail.run.sheetName, status: t(`status.${detail.run.status}`) })}</p><p className="mt-1 break-all text-xs text-gray-500">SHA-256 {detail.run.contentHash}</p></div><Button type="button" variant="outline" onClick={() => void loadImport(detail.run.id, page)} disabled={busy}>{t("refresh")}</Button></div>
          {detail.run.status === "review" && <section className="space-y-3"><h3 className="font-semibold text-opseu-dark">{t("mapColumns")}</h3><p className="text-sm text-gray-700">{t("mappingHelp")}</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.keys(detail.rows[0]?.rawValues ?? {}).map((header) => <label key={header} className="block space-y-1 text-sm"><span className="block truncate font-medium">{header}</span><select className={inputClass} value={mapping[header] ?? ""} onChange={(event) => { setMapping((current) => ({ ...current, [header]: event.target.value || null })); setMappingDirty(true); }}><option value="">{t("leaveInStaging")}</option>{targets.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label>)}</div><Button type="button" disabled={!mappingDirty || busy} onClick={() => void saveMapping()}>{t("saveMapping")}</Button></section>}
          <div className="flex flex-wrap items-center gap-2 border-y border-gray-200 py-3"><Button type="button" variant="outline" disabled={busy || selectedRows.length === 0 || detail.run.status === "published"} onClick={() => void decideRows("accept")}>{t("acceptSelected", { count: selectedRows.length })}</Button><Button type="button" variant="outline" disabled={busy || selectedRows.length === 0 || detail.run.status === "published"} onClick={() => void decideRows("exclude")}>{t("excludeSelected")}</Button><Button type="button" disabled={busy || detail.run.status === "published" || !detail.rows.some((row) => row.decision === "accept")} onClick={() => void publish()}>{t("publishAccepted")}</Button><span className="text-xs text-gray-600">{t("selectionHelp")}</span></div>
          <div className="overflow-x-auto rounded-md border border-gray-200"><table className="min-w-full border-collapse text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-2">{t("select")}</th><th className="p-2">{t("row")}</th>{Object.keys(detail.rows[0]?.rawValues ?? {}).map((header) => <th className="max-w-48 p-2" key={header}>{header}<span className="block font-normal text-gray-500">→ {mapping[header] ? targets.find((field) => field.id === mapping[header])?.label : t("stagingOnly")}</span></th>)}<th className="p-2">{t("reviewStatus")}</th></tr></thead><tbody>{detail.rows.map((row) => <tr key={row.rowIndex} className="border-t border-gray-100 align-top"><td className="p-2"><input type="checkbox" aria-label={t("selectRow", { row: row.rowIndex })} disabled={row.decision === "published" || detail.run.status === "published"} checked={selectedRows.includes(row.rowIndex)} onChange={(event) => setSelectedRows((current) => event.target.checked ? [...current, row.rowIndex] : current.filter((id) => id !== row.rowIndex))} /></td><td className="p-2">{row.rowIndex}</td>{Object.keys(row.rawValues).map((header) => <td className="max-w-48 truncate p-2" key={header} title={row.rawValues[header]}>{row.rawValues[header] || <span className="text-gray-400">—</span>}</td>)}<td className="max-w-64 p-2"><span className="font-medium">{t(`decision.${row.decision}`)}</span>{row.matchReason && <p className="text-xs text-gray-600">{row.matchReason}</p>}{row.errors.map((error) => <p className="text-xs text-red-700" key={error}>{error}</p>)}</td></tr>)}</tbody></table></div>
          <div className="flex items-center justify-between gap-3"><Button type="button" variant="outline" disabled={page === 0 || busy} onClick={() => void loadImport(detail.run.id, page - 1)}>{t("previousPage")}</Button><span className="text-sm text-gray-600">{t("page", { current: page + 1, total: Math.max(1, Math.ceil(detail.totalRows / 100)) })}</span><Button type="button" variant="outline" disabled={(page + 1) * 100 >= detail.totalRows || busy} onClick={() => void loadImport(detail.run.id, page + 1)}>{t("nextPage")}</Button></div>
        </Card> : <Card density="compact"><p className="text-sm text-gray-600">{t("selectImport")}</p></Card>}
      </div>}

      {tab === "records" && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <Card density="compact" className="space-y-3"><CardTitle>{t("people")}</CardTitle>{people.length === 0 ? <p className="text-sm text-gray-600">{t("noPeople")}</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr><th className="p-2">{t("name")}</th><th className="p-2">{t("memberNumber")}</th><th className="p-2">{t("position")}</th><th className="p-2">{t("history")}</th></tr></thead><tbody>{people.map((person) => <tr className="border-t border-gray-100" key={person.id}><td className="p-2">{person.displayName}</td><td className="p-2">{String(person.profile.memberNumber ?? "")}</td><td className="p-2">{String(person.assignments[0]?.jobTitle ?? "")}</td><td className="p-2"><button className="text-opseu-blue underline" onClick={() => void showHistory(person.id)}>{t("viewHistory")}</button></td></tr>)}</tbody></table></div>}</Card>
        <Card density="compact" className="space-y-3"><CardTitle>{t("tableRecords")}</CardTitle><label className="block space-y-1 text-sm"><span>{t("chooseDataset")}</span><select className={inputClass} value={selectedDataset} onChange={(event) => void showRecords(event.target.value)}><option value="">{t("chooseDataset")}</option>{datasets.filter((dataset) => dataset.kind === "table").map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}</select></label><div className="max-h-96 overflow-auto"><pre className="whitespace-pre-wrap break-words rounded-md bg-gray-50 p-3 text-xs">{JSON.stringify(records, null, 2)}</pre></div></Card>
        {personHistory != null && <Card density="compact" className="space-y-3 xl:col-span-2"><div className="flex items-center justify-between"><CardTitle>{t("personHistory")}</CardTitle><button className="text-sm text-opseu-blue underline" onClick={() => setPersonHistory(null)}>{t("close")}</button></div><pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-md bg-gray-50 p-3 text-xs">{JSON.stringify(personHistory, null, 2)}</pre></Card>}
      </div>}

      {tab === "reports" && <Card density="compact" className="space-y-3"><CardTitle>{t("reports")}</CardTitle><p className="max-w-3xl text-sm text-gray-700">{t("reportsComing")}</p></Card>}
    </main>
  );
}
