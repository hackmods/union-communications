import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendServerErrorLog,
  resetErrorFileLogState,
  rotateErrorLogIfNeeded,
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

  it("no-ops quietly when enabled without path", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await appendServerErrorLog(new Error("x"), undefined, {
      ERROR_LOG_FILE_ENABLED: "true",
    });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("rotateErrorLogIfNeeded", () => {
  it("rotates when over maxBytes and keeps numbered siblings", async () => {
    const filePath = path.join(tmpDir, "errors.jsonl");
    await writeFile(filePath, "old-content\n", "utf8");
    await writeFile(`${filePath}.1`, "older\n", "utf8");

    await rotateErrorLogIfNeeded(filePath, 1, 3);

    await expect(readFile(`${filePath}.1`, "utf8")).resolves.toBe("old-content\n");
    await expect(readFile(`${filePath}.2`, "utf8")).resolves.toBe("older\n");
    await expect(readFile(filePath, "utf8")).rejects.toThrow();
  });

  it("append rotates then writes a fresh active file", async () => {
    const filePath = path.join(tmpDir, "rotate-write.jsonl");
    await writeFile(filePath, "x".repeat(50), "utf8");

    await appendServerErrorLog(new Error("after-rotate"), undefined, {
      ERROR_LOG_FILE_ENABLED: "true",
      ERROR_LOG_FILE_PATH: filePath,
      ERROR_LOG_FILE_MAX_BYTES: "10",
      ERROR_LOG_FILE_KEEP: "2",
    });

    const active = await readFile(filePath, "utf8");
    expect(active).toContain("after-rotate");
    const rotated = await readFile(`${filePath}.1`, "utf8");
    expect(rotated).toBe("x".repeat(50));
  });
});
