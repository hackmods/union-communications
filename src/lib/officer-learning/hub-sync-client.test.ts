import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hydrateProgressFromHub,
  maybePushHubProgressAfterPass,
} from "./hub-sync-client";
import {
  OFFICER_LEARNING_PROGRESS_KEY,
  getAllProgress,
  replaceAllProgress,
} from "./progress";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("officer learning hub sync client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("does not push after a quiz pass unless Hub sync is already enabled", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        record: {
          displayName: "Alex",
          hubSyncEnabled: false,
          shareWithLocal: false,
          modules: {},
        },
      }),
    );

    await maybePushHubProgressAfterPass();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined();
  });

  it("pushes device progress after a pass when Hub sync is on", async () => {
    replaceAllProgress({
      "module-1": { status: "completed", scrollDepth: 100, quizPassed: true },
    });
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          record: {
            displayName: "Alex",
            hubSyncEnabled: true,
            shareWithLocal: true,
            modules: {},
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await maybePushHubProgressAfterPass();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PUT" });
    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string) as {
      hubSyncEnabled: boolean;
      modules: Record<string, { quizPassed: boolean }>;
    };
    expect(body.hubSyncEnabled).toBe(true);
    expect(body.modules["module-1"]?.quizPassed).toBe(true);
  });

  it("merges Hub progress onto the device and ignores failed fetches", async () => {
    replaceAllProgress({
      "module-1": { status: "in_progress", scrollDepth: 20, quizPassed: false },
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        record: {
          displayName: "Alex",
          hubSyncEnabled: true,
          shareWithLocal: false,
          modules: {
            "module-1": {
              status: "completed",
              scrollDepth: 100,
              quizPassed: true,
            },
          },
        },
      }),
    );

    const { progress, record } = await hydrateProgressFromHub();
    expect(record?.hubSyncEnabled).toBe(true);
    expect(progress["module-1"]).toMatchObject({
      status: "completed",
      quizPassed: true,
      scrollDepth: 100,
    });
    expect(getAllProgress()["module-1"]?.quizPassed).toBe(true);

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(maybePushHubProgressAfterPass()).resolves.toBeUndefined();
    expect(window.localStorage.getItem(OFFICER_LEARNING_PROGRESS_KEY)).toBeTruthy();
  });
});
