/** Client-side PDF text extraction - runs in browser only, no server upload */

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return extractTextFromPdf(file);
  }
  return file.text();
}
