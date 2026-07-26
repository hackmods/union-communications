#!/usr/bin/env node
/**
 * Package the repo as unionops-src.tar.gz for Proxmox sandbox overlay deploy.
 * Uses `git archive` so node_modules and test artifacts stay out of the tarball.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "unionops-src.tar.gz");

const result = spawnSync(
  "git",
  ["archive", "--format=tar.gz", "-o", out, "HEAD"],
  { cwd: root, stdio: "inherit" },
);

if (result.status !== 0) {
  console.error("git archive failed — is this a git checkout?");
  process.exit(result.status ?? 1);
}

console.log(`Wrote ${out}`);
