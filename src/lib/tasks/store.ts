import type { TaskAdapter } from "./adapter";
import { memoryTaskStore } from "./memory-adapter";

/**
 * Task store — memory-only for FEAT-003 v1.
 * Drizzle schema/migration deferred to avoid conflicting with parallel
 * FEAT-001/002 on migration index 0006+. Flip here when Postgres lands.
 */
export const taskStore: TaskAdapter = memoryTaskStore;
