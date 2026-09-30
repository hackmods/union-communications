import { register } from "node:module";
import { createRequire } from "node:module";

/** Hook CJS `require("server-only")` (tsx transform path). */
createRequire(import.meta.url)("./mock-server-only.cjs");

/** Hook ESM `import "server-only"`. */
register("./server-only-loader.mjs", import.meta.url);
