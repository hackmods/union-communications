import { describe, expect, it } from "vitest";
import {
  hashPathname,
  pickBucketQuip,
  pickRouteStatusQuip,
  resolveRouteStatusBucket,
  stripLocalePrefix,
} from "./route-status-quip";

describe("route-status-quip", () => {
  it("strips locale prefixes", () => {
    expect(stripLocalePrefix("/en/tools")).toBe("/tools");
    expect(stripLocalePrefix("/fr/portal/circles/1")).toBe(
      "/portal/circles/1",
    );
    expect(stripLocalePrefix("/en")).toBe("/");
  });

  it("resolves path buckets", () => {
    expect(resolveRouteStatusBucket("/en/poll/abc", "notFound")).toBe("poll");
    expect(resolveRouteStatusBucket("/fr/r/token", "notFound")).toBe("rsvp");
    expect(resolveRouteStatusBucket("/en/meetings/local", "notFound")).toBe(
      "meeting",
    );
    expect(resolveRouteStatusBucket("/en/portal/fronts", "notFound")).toBe(
      "portal",
    );
    expect(resolveRouteStatusBucket("/en/app/grievances", "notFound")).toBe(
      "hub",
    );
    expect(resolveRouteStatusBucket("/en/app/grievances", "error")).toBe(
      "error",
    );
    expect(resolveRouteStatusBucket("/en/tools", "notFound")).toBe("notFound");
  });

  it("picks a stable quip for the same pathname", () => {
    const quips = ["a", "b", "c", "d", "e"];
    const path = "/en/this-does-not-exist";
    expect(pickRouteStatusQuip(quips, path)).toBe(
      pickRouteStatusQuip(quips, path),
    );
    expect(hashPathname(path)).toBe(hashPathname(path));
  });

  it("falls back when a bucket is empty", () => {
    const quip = pickBucketQuip(
      { notFound: ["fallback"], poll: [] },
      "/en/poll/missing",
      "notFound",
    );
    expect(quip).toBe("fallback");
  });
});
