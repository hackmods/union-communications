/**
 * Allow CLI scripts (db:seed, rls-smoke, etc.) to import modules that use
 * `server-only`. Loaded via `node --require` before tsx.
 */
const Module = require("node:module");
const path = require("node:path");

const stubPath = path.join(__dirname, "empty-server-only.cjs");
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function resolveServerOnlyStub(
  request,
  parent,
  isMain,
  options,
) {
  if (request === "server-only") {
    return stubPath;
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
