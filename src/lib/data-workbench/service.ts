import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  dataAssertions,
  dataDatasets,
  dataEmploymentAssignments,
  dataIdentifiers,
  dataImportRuns,
  dataPeople,
  dataPublications,
  dataRecords,
  dataStagedRows,
  dataUnionMemberships,
  type WorkbenchField,
  type WorkbenchMapping,
} from "@/lib/db/schema/data-workbench";
import type { DataAccessResult } from "./access";
import { applyMapping, isIsoDate, suggestMapping, validateMappedRow } from "./mapping";
import { resolveByIdentifier } from "./resolution";
import type { DataImportRun, DataDataset, DatasetKind, ParsedTable, StagedPreviewRow } from "./types";

type Scope = Extract<DataAccessResult, { ok: true }>;
const newId = () => crypto.randomUUID();

function datasetDto(row: typeof dataDatasets.$inferSelect): DataDataset {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    name: row.name,
    description: row.description,
    kind: row.kind,
    fields: row.fields,
    mapping: row.mapping,
    mappingVersion: row.mappingVersion,
    trustedSource: row.trustedSource,
    createdAt: row.createdAt.toISOString(),
  };
}

function runDto(row: typeof dataImportRuns.$inferSelect): DataImportRun {
  return {
    id: row.id,
    datasetId: row.datasetId,
    fileName: row.fileName,
    contentHash: row.contentHash,
    sheetName: row.sheetName,
    mapping: row.mapping,
    mappingVersion: row.mappingVersion,
    status: row.status,
    rowCount: row.rowCount,
    acceptedCount: row.acceptedCount,
    heldCount: row.heldCount,
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

export async function listDatasets(scope: Scope) {
  const rows = await getDb().select().from(dataDatasets).where(and(
    eq(dataDatasets.unionId, scope.unionId),
    eq(dataDatasets.localId, scope.localId),
  )).orderBy(desc(dataDatasets.updatedAt));
  return rows.map(datasetDto);
}

export async function createDataset(scope: Scope, input: {
  name: string;
  description: string;
  kind: DatasetKind;
  fields: WorkbenchField[];
}) {
  const now = new Date();
  const [row] = await getDb().insert(dataDatasets).values({
    id: newId(),
    unionId: scope.unionId,
    localId: scope.localId,
    name: input.name.trim(),
    description: input.description.trim(),
    kind: input.kind,
    fields: input.fields,
    mapping: {},
    createdById: scope.session.user.id,
    createdAt: now,
    updatedAt: now,
  }).returning();
  return datasetDto(row);
}

export async function getDataset(scope: Scope, id: string) {
  const [row] = await getDb().select().from(dataDatasets).where(and(
    eq(dataDatasets.id, id),
    eq(dataDatasets.unionId, scope.unionId),
    eq(dataDatasets.localId, scope.localId),
  )).limit(1);
  return row ? datasetDto(row) : null;
}

export async function createImportRun(scope: Scope, input: {
  dataset: DataDataset;
  fileName: string;
  contentHash: string;
  storageKey: string;
  scanStatus: string;
  table: ParsedTable;
}) {
  const db = getDb();
  const prior = await db.select({ id: dataImportRuns.id }).from(dataImportRuns).where(and(
    eq(dataImportRuns.datasetId, input.dataset.id),
    eq(dataImportRuns.contentHash, input.contentHash),
    eq(dataImportRuns.mappingVersion, input.dataset.mappingVersion),
  )).limit(1);
  if (prior.length) throw new Error("This exact file and mapping have already been imported.");

  const id = newId();
  const suggested = suggestMapping(input.table.headers, input.dataset.kind);
  const mapping: WorkbenchMapping = { ...suggested, ...Object.fromEntries(
    Object.entries(input.dataset.mapping).filter(([header]) => input.table.headers.includes(header)),
  ) };
  const now = new Date();
  const [run] = await db.insert(dataImportRuns).values({
    id,
    unionId: scope.unionId,
    localId: scope.localId,
    datasetId: input.dataset.id,
    fileName: input.fileName.slice(0, 255),
    contentHash: input.contentHash,
    storageKey: input.storageKey,
    scanStatus: input.scanStatus,
    sheetName: input.table.sheetName,
    mapping,
    mappingVersion: input.dataset.mappingVersion,
    status: "review",
    rowCount: input.table.rows.length,
    createdById: scope.session.user.id,
    createdAt: now,
  }).returning();

  const identifiers = input.dataset.kind === "member_employment"
    ? await db.select({ personId: dataIdentifiers.personId, namespace: dataIdentifiers.namespace, value: dataIdentifiers.value })
      .from(dataIdentifiers).where(and(eq(dataIdentifiers.unionId, scope.unionId), eq(dataIdentifiers.localId, scope.localId)))
    : [];
  for (let offset = 0; offset < input.table.rows.length; offset += 250) {
    const values = input.table.rows.slice(offset, offset + 250).map((rawValues, index) => {
      const mappedValues = normalizeMappedValues(applyMapping(rawValues, mapping), input.dataset.fields);
      const errors = [...validateMappedRow(mappedValues, input.dataset.kind)];
      if (input.dataset.kind === "table") errors.push(...validateTypedFields(mappedValues, input.dataset.fields));
      const match = input.dataset.kind === "member_employment"
        ? resolveByIdentifier({ namespace: "union_member_number", value: String(mappedValues.memberNumber ?? ""), candidates: identifiers.map((r) => ({ id: r.personId, namespace: r.namespace, value: r.value })) })
        : { personId: null, reason: null, conflict: false };
      return {
        id: newId(), unionId: scope.unionId, localId: scope.localId, runId: id,
        rowIndex: offset + index + 2, rawValues, mappedValues, errors,
        matchPersonId: match.personId, matchReason: match.reason,
        decision: "pending" as const,
      };
    });
    await db.insert(dataStagedRows).values(values);
  }
  return runDto(run);
}

async function getDuplicateMemberNumbers(scope: Scope, runId: string, header: string | null | undefined) {
  if (!header) return new Set<string>();
  const values = await getDb().select({
    memberNumber: sql<string | null>`${dataStagedRows.rawValues}->>${header}`,
    decision: dataStagedRows.decision,
  }).from(dataStagedRows).where(and(
    eq(dataStagedRows.runId, runId), eq(dataStagedRows.unionId, scope.unionId), eq(dataStagedRows.localId, scope.localId),
  ));
  const counts = new Map<string, number>();
  for (const row of values) {
    if (row.decision === "exclude") continue;
    const value = String(row.memberNumber ?? "").trim();
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([value]) => value));
}

export async function getImport(scope: Scope, id: string, paging: { offset?: number; limit?: number } = {}) {
  const [run] = await getDb().select().from(dataImportRuns).where(and(
    eq(dataImportRuns.id, id), eq(dataImportRuns.unionId, scope.unionId), eq(dataImportRuns.localId, scope.localId),
  )).limit(1);
  if (!run) return null;
  const dataset = await getDataset(scope, run.datasetId);
  if (!dataset) return null;
  const [{ count }] = await getDb().select({ count: sql<number>`count(*)::int` }).from(dataStagedRows).where(and(eq(dataStagedRows.runId, id), eq(dataStagedRows.unionId, scope.unionId), eq(dataStagedRows.localId, scope.localId)));
  const duplicateNumbers = dataset.kind === "member_employment" ? await getDuplicateMemberNumbers(scope, id, run.mapping.memberNumber) : new Set<string>();
  const rows = await getDb().select().from(dataStagedRows).where(and(eq(dataStagedRows.runId, id), eq(dataStagedRows.unionId, scope.unionId), eq(dataStagedRows.localId, scope.localId))).orderBy(dataStagedRows.rowIndex).limit(Math.max(1, Math.min(paging.limit ?? 100, 200))).offset(Math.max(0, paging.offset ?? 0));
  return { run: runDto(run), dataset, totalRows: count, rows: rows.map((r): StagedPreviewRow => {
    const rawMapped = applyMapping(r.rawValues, run.mapping);
    const mappedValues = normalizeMappedValues(rawMapped, dataset.fields);
    const memberNumber = String(mappedValues.memberNumber ?? "").trim();
    const errors = [...validateMappedRow(mappedValues, dataset.kind), ...(dataset.kind === "table" ? validateTypedFields(mappedValues, dataset.fields) : []), ...(duplicateNumbers.has(memberNumber) ? ["This member number appears more than once in the file."] : [])];
    return { rowIndex: r.rowIndex, rawValues: r.rawValues, mappedValues, errors: [...new Set(errors)], matchPersonId: r.matchPersonId, matchReason: r.matchReason, decision: r.decision };
  }) };
}

export async function listImports(scope: Scope) {
  const rows = await getDb().select().from(dataImportRuns).where(and(
    eq(dataImportRuns.unionId, scope.unionId), eq(dataImportRuns.localId, scope.localId),
  )).orderBy(desc(dataImportRuns.createdAt)).limit(100);
  return rows.map(runDto);
}

export async function saveImportMapping(scope: Scope, runId: string, mapping: WorkbenchMapping) {
  const detail = await getImport(scope, runId);
  if (!detail || detail.run.status !== "review") return null;
  const headers = Object.keys(detail.rows[0]?.rawValues ?? {});
  if (headers.length === 0 || Object.keys(mapping).length !== headers.length || headers.some((h) => !(h in mapping))) throw new Error("Map every column in the imported file.");
  const allowed = new Set(detail.dataset.kind === "member_employment" ? ["memberNumber", "fullName", "email", "phone", "localNumber", "jobTitle", "employer", "worksite", "department", "supervisorName", "effectiveFrom", "effectiveTo", "positionId", "supervisorNumber", ...detail.dataset.fields.map((field) => field.id)] : detail.dataset.fields.map((field) => field.id));
  const targets = Object.values(mapping).filter((value): value is string => Boolean(value));
  if (new Set(targets).size !== targets.length) throw new Error("Map each destination field once. Leave unused columns in staging.");
  if (targets.some((target) => !allowed.has(target))) throw new Error("The mapping includes a field that is not part of this dataset.");
  if (detail.dataset.kind === "member_employment" && !targets.includes("fullName")) throw new Error("Map a column to Full name.");
  const mappingVersion = detail.dataset.mappingVersion + 1;
  await getDb().update(dataImportRuns).set({ mapping, mappingVersion }).where(eq(dataImportRuns.id, runId));
  await getDb().update(dataDatasets).set({ mapping, mappingVersion, updatedAt: new Date() }).where(eq(dataDatasets.id, detail.dataset.id));
  return getImport(scope, runId);
}

export async function setImportDecisions(scope: Scope, runId: string, input: { rowIndexes: number[]; decision: "accept" | "exclude" }) {
  const detail = await getImport(scope, runId);
  if (!detail || !["review", "partially_published"].includes(detail.run.status)) return null;
  const selectedRows = await getDb().select().from(dataStagedRows).where(and(eq(dataStagedRows.runId, runId), eq(dataStagedRows.unionId, scope.unionId), eq(dataStagedRows.localId, scope.localId), inArray(dataStagedRows.rowIndex, input.rowIndexes)));
  if (selectedRows.length !== new Set(input.rowIndexes).size) throw new Error("One or more selected rows are not in this import.");
  const identifiers = detail.dataset.kind === "member_employment"
    ? await getDb().select({ personId: dataIdentifiers.personId, namespace: dataIdentifiers.namespace, value: dataIdentifiers.value }).from(dataIdentifiers).where(and(eq(dataIdentifiers.unionId, scope.unionId), eq(dataIdentifiers.localId, scope.localId)))
    : [];
  const duplicateNumbers = detail.dataset.kind === "member_employment" ? await getDuplicateMemberNumbers(scope, runId, detail.run.mapping.memberNumber) : new Set<string>();
  for (const row of selectedRows) {
    const values = normalizeMappedValues(applyMapping(row.rawValues, detail.run.mapping), detail.dataset.fields);
    const errors = [...validateMappedRow(values, detail.dataset.kind), ...(detail.dataset.kind === "table" ? validateTypedFields(values, detail.dataset.fields) : [])];
    let matchPersonId = row.matchPersonId;
    let matchReason = row.matchReason;
    if (detail.dataset.kind === "member_employment") {
      const memberNumber = String(values.memberNumber ?? "").trim();
      const match = resolveByIdentifier({ namespace: "union_member_number", value: memberNumber, candidates: identifiers.map((item) => ({ id: item.personId, namespace: item.namespace, value: item.value })) });
      matchPersonId = match.personId;
      matchReason = match.reason;
      if (match.conflict) errors.push("Identifier conflict requires review.");
      if (input.decision === "accept" && duplicateNumbers.has(memberNumber)) errors.push("This member number appears more than once in the file; exclude the duplicate row before accepting it.");
    }
    if (input.decision === "accept" && (errors.length || (detail.dataset.kind === "member_employment" && !matchPersonId && !String(values.memberNumber ?? "").trim()))) throw new Error("Rows with errors or without a stable member number must be resolved before acceptance.");
    if (row.decision === "published") throw new Error("Published rows cannot be changed.");
    await getDb().update(dataStagedRows).set({ decision: input.decision, matchPersonId, matchReason }).where(eq(dataStagedRows.id, row.id));
  }
  return getImport(scope, runId);
}

export async function publishImport(scope: Scope, runId: string) {
  const detail = await getImport(scope, runId);
  if (!detail || !["review", "partially_published"].includes(detail.run.status)) return null;
  if (detail.run.status === "partially_published" && detail.run.mappingVersion !== detail.dataset.mappingVersion) throw new Error("The mapping changed after the first publication. Create a new import to use a different mapping.");
  const db = getDb();
  const [lockedDataset] = await db.select({ activeRevision: dataDatasets.activeRevision }).from(dataDatasets).where(and(eq(dataDatasets.id, detail.dataset.id), eq(dataDatasets.unionId, scope.unionId), eq(dataDatasets.localId, scope.localId))).for("update").limit(1);
  if (!lockedDataset) return null;
  // Another request may have published this run while this request waited on
  // the dataset lock, so check the persisted run state again before writing.
  const [lockedRun] = await db.select().from(dataImportRuns).where(and(
    eq(dataImportRuns.id, runId), eq(dataImportRuns.unionId, scope.unionId), eq(dataImportRuns.localId, scope.localId),
  )).for("update").limit(1);
  if (!lockedRun || !["review", "partially_published"].includes(lockedRun.status)) return null;
  if (lockedRun.mappingVersion !== detail.dataset.mappingVersion) throw new Error("The mapping changed after the first publication. Create a new import to use a different mapping.");
  const allStaged = await getDb().select().from(dataStagedRows).where(and(eq(dataStagedRows.runId, runId), eq(dataStagedRows.unionId, scope.unionId), eq(dataStagedRows.localId, scope.localId))).orderBy(dataStagedRows.rowIndex);
  const eligible: StagedPreviewRow[] = [];
  const acceptedIdentifiers = new Set<string>();
  const acceptedNumberFrequency = new Map<string, number>();
  if (detail.dataset.kind === "member_employment") {
    for (const staged of allStaged.filter((row) => row.decision === "accept")) {
      const number = String(normalizeMappedValues(applyMapping(staged.rawValues, detail.run.mapping), detail.dataset.fields).memberNumber ?? "").trim();
      if (number) acceptedNumberFrequency.set(number, (acceptedNumberFrequency.get(number) ?? 0) + 1);
    }
  }
  const existingIdentifiers = detail.dataset.kind === "member_employment"
    ? await db.select({ personId: dataIdentifiers.personId, namespace: dataIdentifiers.namespace, value: dataIdentifiers.value }).from(dataIdentifiers).where(and(eq(dataIdentifiers.unionId, scope.unionId), eq(dataIdentifiers.localId, scope.localId)))
    : [];
  for (const staged of allStaged.filter((row) => row.decision === "accept")) {
    const mappedValues = normalizeMappedValues(applyMapping(staged.rawValues, detail.run.mapping), detail.dataset.fields);
    const errors = [...validateMappedRow(mappedValues, detail.dataset.kind), ...(detail.dataset.kind === "table" ? validateTypedFields(mappedValues, detail.dataset.fields) : [])];
    const memberNumber = String(mappedValues.memberNumber ?? "").trim();
    const match = detail.dataset.kind === "member_employment"
      ? resolveByIdentifier({ namespace: "union_member_number", value: memberNumber, candidates: existingIdentifiers.map((item) => ({ id: item.personId, namespace: item.namespace, value: item.value })) })
      : { personId: null, reason: null, conflict: false };
    if (detail.dataset.kind === "member_employment" && (!memberNumber || match.conflict || (!match.personId && existingIdentifiers.some((item) => item.namespace === "union_member_number" && item.value === memberNumber)) || acceptedIdentifiers.has(memberNumber) || (acceptedNumberFrequency.get(memberNumber) ?? 0) > 1)) errors.push("Member number is missing, duplicated, or conflicts with an existing record.");
    if (errors.length) {
      await db.update(dataStagedRows).set({ decision: "pending", errors, matchPersonId: match.personId, matchReason: match.reason }).where(eq(dataStagedRows.id, staged.id));
      continue;
    }
    if (memberNumber) acceptedIdentifiers.add(memberNumber);
    eligible.push({ rowIndex: staged.rowIndex, rawValues: staged.rawValues, mappedValues, errors, matchPersonId: match.personId, matchReason: match.reason, decision: staged.decision });
  }
  let held = allStaged.filter((row) => row.decision === "pending" || row.decision === "accept").length - eligible.length;
  if (!eligible.length) throw new Error("Accept at least one valid row before publishing.");
  const personIds = new Map<string, string>();
  const existingNumbers = new Set<string>();
  for (const item of existingIdentifiers) {
    if (item.namespace === "union_member_number") {
      personIds.set(item.value, item.personId);
      existingNumbers.add(item.value);
    }
  }
  if (detail.dataset.kind === "member_employment") {
    for (const row of eligible) {
      const memberNumber = String(row.mappedValues.memberNumber ?? "").trim();
      personIds.set(memberNumber, row.matchPersonId ?? personIds.get(memberNumber) ?? newId());
    }
    const unresolvedSupervisors = eligible.filter((row) => {
      const supervisorNumber = String(row.mappedValues.supervisorNumber ?? "").trim();
      return supervisorNumber && !personIds.has(supervisorNumber);
    });
    if (unresolvedSupervisors.length) {
      const rowIndexes = new Set(unresolvedSupervisors.map((row) => row.rowIndex));
      for (const row of unresolvedSupervisors) {
        await db.update(dataStagedRows).set({ decision: "pending", errors: [...row.errors, "Supervisor identifier does not resolve to an accepted person."] }).where(and(eq(dataStagedRows.runId, runId), eq(dataStagedRows.rowIndex, row.rowIndex)));
      }
      eligible.splice(0, eligible.length, ...eligible.filter((row) => !rowIndexes.has(row.rowIndex)));
      held += unresolvedSupervisors.length;
    }
    if (!eligible.length) throw new Error("No accepted rows have a resolvable member and supervisor identity.");

    const currentAssignments = await db.select({ personId: dataEmploymentAssignments.personId, supervisorPersonId: dataEmploymentAssignments.supervisorPersonId }).from(dataEmploymentAssignments).where(and(
      eq(dataEmploymentAssignments.unionId, scope.unionId), eq(dataEmploymentAssignments.localId, scope.localId), eq(dataEmploymentAssignments.effectiveTo, ""),
    ));
    const edges = new Map<string, Set<string>>();
    const addEdge = (personId: string, supervisorId: string | null) => {
      if (!supervisorId) return;
      const supervisors = edges.get(personId) ?? new Set<string>();
      supervisors.add(supervisorId);
      edges.set(personId, supervisors);
    };
    for (const assignment of currentAssignments) addEdge(assignment.personId, assignment.supervisorPersonId);
    for (const row of eligible) addEdge(personIds.get(String(row.mappedValues.memberNumber ?? "").trim()) ?? "", personIds.get(String(row.mappedValues.supervisorNumber ?? "").trim()) ?? null);
    const hasPath = (from: string, target: string, visited = new Set<string>()): boolean => {
      if (from === target) return true;
      if (visited.has(from)) return false;
      visited.add(from);
      for (const next of edges.get(from) ?? []) if (hasPath(next, target, visited)) return true;
      return false;
    };
    const cyclicRows = eligible.filter((row) => {
      const memberNumber = String(row.mappedValues.memberNumber ?? "").trim();
      const supervisorNumber = String(row.mappedValues.supervisorNumber ?? "").trim();
      const personId = personIds.get(memberNumber);
      const supervisorId = personIds.get(supervisorNumber);
      return Boolean(personId && supervisorId && hasPath(supervisorId, personId));
    });
    if (cyclicRows.length) {
      const cyclicIndexes = new Set(cyclicRows.map((row) => row.rowIndex));
      const rejectedNumbers = new Set(cyclicRows.map((row) => String(row.mappedValues.memberNumber ?? "").trim()).filter((number) => !existingNumbers.has(number)));
      for (const row of cyclicRows) {
        await db.update(dataStagedRows).set({ decision: "pending", errors: [...row.errors, "Supervisor relationship would create a reporting cycle."] }).where(and(eq(dataStagedRows.runId, runId), eq(dataStagedRows.rowIndex, row.rowIndex)));
      }
      eligible.splice(0, eligible.length, ...eligible.filter((row) => !cyclicIndexes.has(row.rowIndex)));
      held += cyclicRows.length;
      const dependentRows = eligible.filter((row) => rejectedNumbers.has(String(row.mappedValues.supervisorNumber ?? "").trim()));
      if (dependentRows.length) {
        const dependentIndexes = new Set(dependentRows.map((row) => row.rowIndex));
        for (const row of dependentRows) {
          await db.update(dataStagedRows).set({ decision: "pending", errors: [...row.errors, "Supervisor row is held for review."] }).where(and(eq(dataStagedRows.runId, runId), eq(dataStagedRows.rowIndex, row.rowIndex)));
        }
        eligible.splice(0, eligible.length, ...eligible.filter((row) => !dependentIndexes.has(row.rowIndex)));
        held += dependentRows.length;
      }
      if (!eligible.length) throw new Error("All accepted rows would create or depend on a reporting cycle and have been returned to review.");
    }

    // A held supervisor row cannot leave behind a dangling relationship in an
    // otherwise publishable dependent row. Repeat until all remaining links
    // resolve to either an existing person or another accepted row.
    while (true) {
      const acceptedNumbers = new Set(eligible.map((row) => String(row.mappedValues.memberNumber ?? "").trim()));
      const dependentRows = eligible.filter((row) => {
        const supervisorNumber = String(row.mappedValues.supervisorNumber ?? "").trim();
        return supervisorNumber && !existingNumbers.has(supervisorNumber) && !acceptedNumbers.has(supervisorNumber);
      });
      if (!dependentRows.length) break;
      const dependentIndexes = new Set(dependentRows.map((row) => row.rowIndex));
      for (const row of dependentRows) {
        await db.update(dataStagedRows).set({ decision: "pending", errors: [...row.errors, "Supervisor row is held for review."] }).where(and(eq(dataStagedRows.runId, runId), eq(dataStagedRows.rowIndex, row.rowIndex)));
      }
      eligible.splice(0, eligible.length, ...eligible.filter((row) => !dependentIndexes.has(row.rowIndex)));
      held += dependentRows.length;
      if (!eligible.length) throw new Error("All accepted rows depend on a supervisor held for review.");
    }

    const peopleToCreate = eligible.filter((row) => !existingNumbers.has(String(row.mappedValues.memberNumber ?? "").trim())).map((row) => ({
      id: personIds.get(String(row.mappedValues.memberNumber ?? "").trim())!, unionId: scope.unionId, localId: scope.localId,
      displayName: String(row.mappedValues.fullName ?? "").trim(), createdById: scope.session.user.id,
    }));
    const identifiersToCreate = eligible.filter((row) => !existingNumbers.has(String(row.mappedValues.memberNumber ?? "").trim())).map((row) => ({
      id: newId(), unionId: scope.unionId, localId: scope.localId, personId: personIds.get(String(row.mappedValues.memberNumber ?? "").trim())!,
      namespace: "union_member_number", value: String(row.mappedValues.memberNumber ?? "").trim(), sourceRunId: runId,
    }));
    if (peopleToCreate.length) await db.insert(dataPeople).values(peopleToCreate);
    if (identifiersToCreate.length) await db.insert(dataIdentifiers).values(identifiersToCreate);
  }
  const revision = lockedDataset.activeRevision + 1;
  const publicationId = newId();
  await db.insert(dataPublications).values({ id: publicationId, unionId: scope.unionId, localId: scope.localId, datasetId: detail.dataset.id, runId, revision, acceptedCount: eligible.length, publishedById: scope.session.user.id });

  if (detail.dataset.kind === "table") {
    for (let offset = 0; offset < eligible.length; offset += 250) {
      await db.insert(dataRecords).values(eligible.slice(offset, offset + 250).map((row) => ({ id: newId(), unionId: scope.unionId, localId: scope.localId, datasetId: detail.dataset.id, publicationId, rowIndex: row.rowIndex, values: row.mappedValues })));
    }
  } else {
    for (const row of eligible) {
      const memberNumber = String(row.mappedValues.memberNumber ?? "").trim();
      const personId = personIds.get(memberNumber);
      if (!personId) throw new Error(`Row ${row.rowIndex} has no stable member number.`);
      if (String(row.mappedValues.fullName ?? "").trim()) await db.update(dataPeople).set({ displayName: String(row.mappedValues.fullName).trim() }).where(eq(dataPeople.id, personId));
      const assertionKeys = new Set(["fullName", "email", "phone", "localNumber", "jobTitle", "employer", "worksite", "department", "supervisorName", ...detail.dataset.fields.map((field) => field.id)]);
      for (const fieldKey of assertionKeys) {
        const value = row.mappedValues[fieldKey];
        if (value === undefined || value === null || value === "") continue;
        await db.insert(dataAssertions).values({ id: newId(), unionId: scope.unionId, localId: scope.localId, personId, runId, rowIndex: row.rowIndex, fieldKey, value, effectiveFrom: String(row.mappedValues.effectiveFrom ?? "") || null, effectiveTo: String(row.mappedValues.effectiveTo ?? "") || null });
      }
      const positionFields = ["employer", "jobTitle", "worksite", "department", "supervisorName"];
      if (positionFields.some((key) => String(row.mappedValues[key] ?? "").trim()) && String(row.mappedValues.positionId ?? "").trim()) {
        const positionKey = String(row.mappedValues.positionId ?? "").trim();
        const effectiveFrom = String(row.mappedValues.effectiveFrom ?? "") || null;
        const supervisorNumber = String(row.mappedValues.supervisorNumber ?? "").trim();
        const reportedEnd = String(row.mappedValues.effectiveTo ?? "");
        const [current] = await db.select().from(dataEmploymentAssignments).where(and(
          eq(dataEmploymentAssignments.personId, personId), eq(dataEmploymentAssignments.localId, scope.localId),
          eq(dataEmploymentAssignments.positionKey, positionKey), eq(dataEmploymentAssignments.effectiveTo, ""),
        )).limit(1);
        const keepUnlessProvided = (key: string, previous: string) => String(row.mappedValues[key] ?? "").trim() || previous;
        const supervisorPersonId = supervisorNumber ? personIds.get(supervisorNumber) ?? null : current?.supervisorPersonId ?? null;
        const assignment = {
          employer: keepUnlessProvided("employer", current?.employer ?? ""),
          jobTitle: keepUnlessProvided("jobTitle", current?.jobTitle ?? ""),
          worksite: keepUnlessProvided("worksite", current?.worksite ?? ""),
          department: keepUnlessProvided("department", current?.department ?? ""),
          supervisorName: keepUnlessProvided("supervisorName", current?.supervisorName ?? ""),
          positionKey,
          supervisorPersonId,
        };
        const changed = Boolean(current && (
          current.employer !== assignment.employer || current.jobTitle !== assignment.jobTitle || current.worksite !== assignment.worksite ||
          current.department !== assignment.department || current.supervisorName !== assignment.supervisorName || current.supervisorPersonId !== supervisorPersonId
        ));
        let historicalEnd: string | null = null;
        let endedUnchangedAssignment = false;
        if (current && changed && effectiveFrom && current.effectiveFrom && effectiveFrom < current.effectiveFrom) historicalEnd = current.effectiveFrom;
        else if (current && changed) await db.update(dataEmploymentAssignments).set({ effectiveTo: effectiveFrom ?? new Date().toISOString().slice(0, 10) }).where(eq(dataEmploymentAssignments.id, current.id));
        else if (current && reportedEnd) {
          await db.update(dataEmploymentAssignments).set({ effectiveTo: reportedEnd }).where(eq(dataEmploymentAssignments.id, current.id));
          endedUnchangedAssignment = true;
        }
        if ((!current || changed) && !endedUnchangedAssignment) {
          await db.insert(dataEmploymentAssignments).values({ id: newId(), unionId: scope.unionId, localId: scope.localId, personId, runId, rowIndex: row.rowIndex, ...assignment, effectiveFrom, effectiveTo: historicalEnd ?? (reportedEnd || "") });
        }
      }
      const membershipFrom = String(row.mappedValues.effectiveFrom ?? "") || null;
      if (memberNumber) {
        const currentMemberships = await db.select().from(dataUnionMemberships).where(and(eq(dataUnionMemberships.personId, personId), eq(dataUnionMemberships.unionId, scope.unionId), eq(dataUnionMemberships.localId, scope.localId), eq(dataUnionMemberships.effectiveTo, ""))).limit(1);
        const sameMembership = currentMemberships.find((membership) => membership.memberNumber === memberNumber);
        const reportedEnd = String(row.mappedValues.effectiveTo ?? "");
        if (sameMembership && reportedEnd) {
          await db.update(dataUnionMemberships).set({ effectiveTo: reportedEnd }).where(eq(dataUnionMemberships.id, sameMembership.id));
        } else if (!sameMembership) {
          if (currentMemberships.length) await db.update(dataUnionMemberships).set({ effectiveTo: membershipFrom ?? new Date().toISOString().slice(0, 10) }).where(eq(dataUnionMemberships.id, currentMemberships[0].id));
          await db.insert(dataUnionMemberships).values({ id: newId(), unionId: scope.unionId, localId: scope.localId, personId, runId, memberNumber, effectiveFrom: membershipFrom, effectiveTo: reportedEnd || "" });
        }
      }
    }
  }
  await db.update(dataDatasets).set({ activeRevision: revision, updatedAt: new Date() }).where(eq(dataDatasets.id, detail.dataset.id));
  for (const row of eligible) await db.update(dataStagedRows).set({ decision: "published" }).where(and(eq(dataStagedRows.runId, runId), eq(dataStagedRows.rowIndex, row.rowIndex)));
  const status = held ? "partially_published" : "published";
  await db.update(dataImportRuns).set({ status, acceptedCount: lockedRun.acceptedCount + eligible.length, heldCount: held, publishedAt: new Date() }).where(eq(dataImportRuns.id, runId));
  return { publicationId, revision, acceptedCount: eligible.length, heldCount: held, status };
}

function normalizeMappedValues(values: Record<string, unknown>, fields: WorkbenchField[]) {
  const normalized = { ...values };
  for (const field of fields) {
    if (!(field.id in normalized)) continue;
    const value = String(normalized[field.id] ?? "").trim();
    if (!value) { normalized[field.id] = null; continue; }
    if (field.type === "number") {
      const number = Number(value);
      normalized[field.id] = Number.isFinite(number) ? number : value;
    } else if (field.type === "boolean") {
      normalized[field.id] = /^(true|yes|1)$/i.test(value) ? true : /^(false|no|0)$/i.test(value) ? false : value;
    } else {
      normalized[field.id] = value;
    }
  }
  return normalized;
}

function validateTypedFields(values: Record<string, unknown>, fields: WorkbenchField[]) {
  const errors: string[] = [];
  for (const field of fields) {
    const value = values[field.id];
    if (value == null || value === "") continue;
    if (field.type === "number" && typeof value !== "number") errors.push(`${field.label} must be a number.`);
    if (field.type === "boolean" && typeof value !== "boolean") errors.push(`${field.label} must be true/false, yes/no, or 1/0.`);
    if (field.type === "date" && !isIsoDate(String(value))) errors.push(`${field.label} must be a valid date in YYYY-MM-DD format.`);
  }
  return errors;
}

export async function listPeople(scope: Scope, paging: { offset?: number; limit?: number } = {}) {
  const db = getDb();
  const offset = Math.max(0, paging.offset ?? 0);
  const limit = Math.max(1, Math.min(paging.limit ?? 100, 200));
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(dataPeople).where(and(eq(dataPeople.unionId, scope.unionId), eq(dataPeople.localId, scope.localId)));
  const people = await db.select().from(dataPeople).where(and(eq(dataPeople.unionId, scope.unionId), eq(dataPeople.localId, scope.localId))).orderBy(dataPeople.displayName).limit(limit).offset(offset);
  if (!people.length) return { people: [], total: count, nextOffset: null as number | null };
  const personIds = people.map((person) => person.id);
  const [assertions, assignments] = await Promise.all([
    db.select().from(dataAssertions).where(and(inArray(dataAssertions.personId, personIds), eq(dataAssertions.unionId, scope.unionId), eq(dataAssertions.localId, scope.localId))).orderBy(desc(dataAssertions.observedAt)),
    db.select().from(dataEmploymentAssignments).where(and(inArray(dataEmploymentAssignments.personId, personIds), eq(dataEmploymentAssignments.unionId, scope.unionId), eq(dataEmploymentAssignments.localId, scope.localId))).orderBy(desc(dataEmploymentAssignments.observedAt)),
  ]);
  const profiles = new Map<string, Record<string, unknown>>();
  for (const assertion of assertions) {
    const profile = profiles.get(assertion.personId) ?? {};
    if (!(assertion.fieldKey in profile)) profile[assertion.fieldKey] = assertion.value;
    profiles.set(assertion.personId, profile);
  }
  const assignmentsByPerson = new Map<string, typeof assignments>();
  for (const assignment of assignments) assignmentsByPerson.set(assignment.personId, [...(assignmentsByPerson.get(assignment.personId) ?? []), assignment]);
  return {
    people: people.map((person) => ({ id: person.id, displayName: person.displayName, profile: profiles.get(person.id) ?? {}, assignments: assignmentsByPerson.get(person.id) ?? [] })),
    total: count,
    nextOffset: offset + people.length < count ? offset + people.length : null,
  };
}

export async function getPersonHistory(scope: Scope, personId: string, paging: { offset?: number; limit?: number } = {}) {
  const db = getDb();
  const offset = Math.max(0, paging.offset ?? 0);
  const limit = Math.max(1, Math.min(paging.limit ?? 100, 200));
  const [person] = await db.select().from(dataPeople).where(and(
    eq(dataPeople.id, personId), eq(dataPeople.unionId, scope.unionId), eq(dataPeople.localId, scope.localId),
  )).limit(1);
  if (!person) return null;
  const whereAssertions = and(eq(dataAssertions.personId, personId), eq(dataAssertions.unionId, scope.unionId), eq(dataAssertions.localId, scope.localId));
  const whereMemberships = and(eq(dataUnionMemberships.personId, personId), eq(dataUnionMemberships.unionId, scope.unionId), eq(dataUnionMemberships.localId, scope.localId));
  const whereAssignments = and(eq(dataEmploymentAssignments.personId, personId), eq(dataEmploymentAssignments.unionId, scope.unionId), eq(dataEmploymentAssignments.localId, scope.localId));
  const [identifiers, assertionCount, membershipCount, assignmentCount, assertions, memberships, assignments] = await Promise.all([
    db.select({ namespace: dataIdentifiers.namespace, value: dataIdentifiers.value }).from(dataIdentifiers).where(and(eq(dataIdentifiers.personId, personId), eq(dataIdentifiers.unionId, scope.unionId), eq(dataIdentifiers.localId, scope.localId))),
    db.select({ count: sql<number>`count(*)::int` }).from(dataAssertions).where(whereAssertions),
    db.select({ count: sql<number>`count(*)::int` }).from(dataUnionMemberships).where(whereMemberships),
    db.select({ count: sql<number>`count(*)::int` }).from(dataEmploymentAssignments).where(whereAssignments),
    db.select().from(dataAssertions).where(whereAssertions).orderBy(desc(dataAssertions.observedAt)).limit(limit).offset(offset),
    db.select().from(dataUnionMemberships).where(whereMemberships).orderBy(desc(dataUnionMemberships.observedAt)).limit(limit).offset(offset),
    db.select().from(dataEmploymentAssignments).where(whereAssignments).orderBy(desc(dataEmploymentAssignments.observedAt)).limit(limit).offset(offset),
  ]);
  return {
    person, identifiers, assertions, memberships, assignments,
    pagination: {
      offset, limit,
      assertionsTotal: assertionCount[0]?.count ?? 0,
      membershipsTotal: membershipCount[0]?.count ?? 0,
      assignmentsTotal: assignmentCount[0]?.count ?? 0,
      assertionsNextOffset: offset + assertions.length < (assertionCount[0]?.count ?? 0) ? offset + assertions.length : null,
      membershipsNextOffset: offset + memberships.length < (membershipCount[0]?.count ?? 0) ? offset + memberships.length : null,
      assignmentsNextOffset: offset + assignments.length < (assignmentCount[0]?.count ?? 0) ? offset + assignments.length : null,
    },
  };
}

export async function getDirectReports(scope: Scope, supervisorPersonId: string, paging: { offset?: number; limit?: number } = {}) {
  const db = getDb();
  const offset = Math.max(0, paging.offset ?? 0);
  const limit = Math.max(1, Math.min(paging.limit ?? 100, 200));
  const where = and(
    eq(dataEmploymentAssignments.unionId, scope.unionId), eq(dataEmploymentAssignments.localId, scope.localId), eq(dataEmploymentAssignments.supervisorPersonId, supervisorPersonId), eq(dataEmploymentAssignments.effectiveTo, ""),
  );
  const [{ count }] = await db.select({ count: sql<number>`count(distinct ${dataEmploymentAssignments.personId})::int` }).from(dataEmploymentAssignments).where(where);
  const people = await db.select({ id: dataPeople.id, displayName: dataPeople.displayName }).from(dataPeople)
    .innerJoin(dataEmploymentAssignments, eq(dataPeople.id, dataEmploymentAssignments.personId))
    .where(and(where, eq(dataPeople.unionId, scope.unionId), eq(dataPeople.localId, scope.localId)))
    .groupBy(dataPeople.id, dataPeople.displayName).orderBy(dataPeople.displayName).limit(limit).offset(offset);
  return { people, total: count, nextOffset: offset + people.length < count ? offset + people.length : null };
}

export async function getReportingChain(scope: Scope, personId: string) {
  const chain: Array<{ id: string; displayName: string }> = [];
  const visited = new Set([personId]);
  let currentId = personId;
  for (let depth = 0; depth < 50; depth += 1) {
    const [assignment] = await getDb().select({ supervisorPersonId: dataEmploymentAssignments.supervisorPersonId }).from(dataEmploymentAssignments).where(and(
      eq(dataEmploymentAssignments.personId, currentId), eq(dataEmploymentAssignments.unionId, scope.unionId), eq(dataEmploymentAssignments.localId, scope.localId), eq(dataEmploymentAssignments.effectiveTo, ""),
    )).orderBy(desc(dataEmploymentAssignments.observedAt)).limit(1);
    if (!assignment?.supervisorPersonId || visited.has(assignment.supervisorPersonId)) break;
    const [supervisor] = await getDb().select({ id: dataPeople.id, displayName: dataPeople.displayName }).from(dataPeople).where(and(eq(dataPeople.id, assignment.supervisorPersonId), eq(dataPeople.unionId, scope.unionId), eq(dataPeople.localId, scope.localId))).limit(1);
    if (!supervisor) break;
    chain.push(supervisor);
    visited.add(supervisor.id);
    currentId = supervisor.id;
  }
  return chain;
}

export async function listGenericRecords(scope: Scope, datasetId: string, paging: { offset?: number; limit?: number } = {}) {
  const offset = Math.max(0, paging.offset ?? 0);
  const limit = Math.max(1, Math.min(paging.limit ?? 200, 500));
  const dataset = await getDataset(scope, datasetId);
  if (!dataset || dataset.kind !== "table") return null;
  const [dbDataset] = await getDb().select({ activeRevision: dataDatasets.activeRevision }).from(dataDatasets).where(and(
    eq(dataDatasets.id, datasetId), eq(dataDatasets.unionId, scope.unionId), eq(dataDatasets.localId, scope.localId),
  )).limit(1);
  if (!dbDataset?.activeRevision) return { dataset, records: [], total: 0, offset, nextOffset: null as number | null };
  const [publication] = await getDb().select({ id: dataPublications.id }).from(dataPublications).where(and(
    eq(dataPublications.datasetId, datasetId), eq(dataPublications.unionId, scope.unionId), eq(dataPublications.localId, scope.localId), eq(dataPublications.revision, dbDataset.activeRevision),
  )).limit(1);
  if (!publication) return { dataset, records: [], total: 0, offset, nextOffset: null as number | null };
  const [{ count }] = await getDb().select({ count: sql<number>`count(*)::int` }).from(dataRecords).where(and(
    eq(dataRecords.datasetId, datasetId), eq(dataRecords.unionId, scope.unionId), eq(dataRecords.localId, scope.localId), eq(dataRecords.publicationId, publication.id),
  ));
  const records = await getDb().select({ rowIndex: dataRecords.rowIndex, values: dataRecords.values }).from(dataRecords).where(and(
    eq(dataRecords.datasetId, datasetId), eq(dataRecords.unionId, scope.unionId), eq(dataRecords.localId, scope.localId), eq(dataRecords.publicationId, publication.id),
  )).orderBy(dataRecords.rowIndex).limit(limit).offset(offset);
  return { dataset, records, total: count, offset, nextOffset: offset + records.length < count ? offset + records.length : null };
}
