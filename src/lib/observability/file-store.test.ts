import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileObservabilityStore } from "@/lib/observability/file-store";
import { resetErrorFileLogState } from "@/lib/observability/file-log";

let tmpDir: string;

beforeEach(async () => {
  resetErrorFileLogState();
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "unionops-obs-store-"));
});

afterEach(async () => {
  resetErrorFileLogState();
  await rm(tmpDir, { recursive: true, force: true });
});

describe("FileObservabilityStore", () => {
  it("is disabled without file sink", () => {
    const store = new FileObservabilityStore({});
    expect(store.isEnabled()).toBe(false);
  });

  it("appends, queries newest-first, and exports csv/jsonl", async () => {
    const filePath = path.join(tmpDir, "errors.jsonl");
    const env = {
      ERROR_LOG_FILE_ENABLED: "true",
      ERROR_LOG_FILE_PATH: filePath,
    };
    const store = new FileObservabilityStore(env);
    expect(store.isEnabled()).toBe(true);

    await store.append({
      level: "error",
      source: "server",
      message: "first",
      route: "/api/a",
      ts: "2026-09-29T10:00:00.000Z",
    });
    await store.append({
      level: "warn",
      source: "client",
      message: "second",
      route: "/app",
      signal: "action.drift",
      ts: "2026-09-29T11:00:00.000Z",
    });

    const raw = await readFile(filePath, "utf8");
    expect(raw.trim().split("\n")).toHaveLength(2);

    const all = await store.query({ limit: 10 });
    expect(all).toHaveLength(2);
    expect(all[0]?.message).toBe("second");
    expect(all[1]?.message).toBe("first");

    const clients = await store.query({ source: "client", limit: 10 });
    expect(clients).toHaveLength(1);
    expect(clients[0]?.source).toBe("client");

    const csv = await store.export({ limit: 10 }, "csv");
    expect(csv.eventCount).toBe(2);
    expect(csv.body).toContain("second");
    expect(csv.filename).toBe("unionops-errors.csv");

    const jsonl = await store.export({ limit: 10 }, "jsonl");
    expect(jsonl.eventCount).toBe(2);
    expect(jsonl.body).toContain('"source":"client"');
    expect(jsonl.filename).toBe("unionops-errors.jsonl");
  });

  it("redacts bearer tokens in appended messages", async () => {
    const filePath = path.join(tmpDir, "redact.jsonl");
    const store = new FileObservabilityStore({
      ERROR_LOG_FILE_ENABLED: "true",
      ERROR_LOG_FILE_PATH: filePath,
    });
    await store.append({
      level: "error",
      source: "server",
      message: "Authorization Bearer super-secret-token-value failed",
    });
    const events = await store.query({ limit: 1 });
    expect(events[0]?.message).toContain("[REDACTED]");
    expect(events[0]?.message).not.toContain("super-secret-token-value");
  });
});
