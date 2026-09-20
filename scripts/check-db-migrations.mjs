#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateJournalManifest } from "../docker/db-deploy.mjs";

const root = resolve(import.meta.dirname, "..");
const relativeDir = "src/lib/db/migrations";
const migrationsDir = join(root, relativeDir);
const journalPath = join(migrationsDir, "meta", "_journal.json");

function gitShow(base, path) {
  return execFileSync("git", ["show", `${base}:${path.replaceAll("\\", "/")}`], {
    cwd: root,
    encoding: "utf8",
  });
}

const currentJournal = JSON.parse(readFileSync(journalPath, "utf8"));
validateJournalManifest(currentJournal, readdirSync(migrationsDir));

const baseIndex = process.argv.indexOf("--base");
const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : undefined;
if (base) {
  const baseJournalText = gitShow(base, `${relativeDir}/meta/_journal.json`);
  const baseJournal = JSON.parse(baseJournalText);
  const currentEntries = currentJournal.entries;
  const baseEntries = baseJournal.entries;
  if (currentEntries.length < baseEntries.length) {
    throw new Error("migration journal history was truncated");
  }
  for (let index = 0; index < baseEntries.length; index += 1) {
    if (JSON.stringify(currentEntries[index]) !== JSON.stringify(baseEntries[index])) {
      throw new Error(`released journal entry ${index} was edited; migrations are append-only`);
    }
    const file = `${baseEntries[index].tag}.sql`;
    const baseSql = gitShow(base, `${relativeDir}/${file}`);
    const currentSql = readFileSync(join(migrationsDir, file), "utf8");
    if (currentSql !== baseSql) {
      throw new Error(`released migration ${file} was edited; append a corrective migration`);
    }
  }
}

console.log(
  `[db-migrations] valid entries=${currentJournal.entries.length}${base ? ` append-only-base=${base}` : ""}`,
);
