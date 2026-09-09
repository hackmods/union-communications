import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendServerErrorLog,
  resetErrorFileLogState,
} from "@/lib/observability/file-log";

let tmpDir: string;

beforeEach(async () => {
  resetErrorFileLogState();
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "unionops-errlog-"));
});

afterEach(async () => {
  resetErrorFileLogState();
  vi.restoreAllMocks();
  await rm(tmpDir, { recursive: true, force: true });
});

describe("appendServerErrorLog", () => {
  it("no-ops when file logging is off", async () => {
    const filePath = path.join(tmpDir, "errors.jsonl");
    await appendServerErrorLog(new Error("skip"), undefined, {});
    await expect(readFile(filePath, "utf8")).rejects.toThrow();
  });

  it("appends JSONL when enabled", async () => {
    const filePath = path.join(tmpDir, "nested", "errors.jsonl");
    const err = new Error("boom");
    await appendServerErrorLog(err, { route: "/api/health" }, {
      ERROR_LOG_FILE_ENABLED: "true",
      ERROR_LOG_FILE_PATH: filePath,
    });

    const raw = await readFile(filePath, "utf8");
    const line = JSON.parse(raw.trim()) as {
      level: string;
      message: string;
      route?: string;
      name?: string;
    };
    expect(line.level).toBe("error");
    expect(line.message).toBe("boom");
    expect(line.name).toBe("Error");
    expect(line.route).toBe("/api/health");
  });

  it("warns once when enabled without path", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const env = { ERROR_LOG_FILE_ENABLED: "true" };
    await appendServerErrorLog(new Error("x"), undefined, env);
    await appendServerErrorLog(new Error("y"), undefined, env);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("ERROR_LOG_FILE_PATH");
  });
});
