import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const stubUrl = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), "empty-server-only.cjs"),
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      shortCircuit: true,
      url: stubUrl,
    };
  }
  return nextResolve(specifier, context);
}
