/**
 * Selector for the live canvas node that `exportNodeAsPng` / `nodeToPdf` capture.
 * Stamp `data-export-root` on that element in JSX (static attribute — do not
 * bind via a render-time ref helper; React Compiler forbids reading refs in render).
 */
export const EXPORT_ROOT_SELECTOR = "[data-export-root]";
