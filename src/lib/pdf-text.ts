import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// Use Vite's ?url to get a deployable URL for the worker, avoiding CDN mismatches
// This runs in the browser (client-side), not in backend functions.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite will resolve this to a URL string
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;

  let allText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = (textContent.items || [])
      .map((item: any) => (typeof item?.str === "string" ? item.str : ""))
      .join(" ");
    allText += pageText + "\n";
  }

  return allText.trim();
}
