export type StaticDoc = { title: string; file: string; kind: "pdf" | "video"; sizeBytes: number };

export const DOCS_ORIGIN = "https://www.muscleboxpro.com";
export const DOCS_PATH = "/assets/docs";

export const STATIC_DOCS: readonly StaticDoc[] = [
  { title: "Franchise Dashboard Documentation", file: "franchise-dashboard-documentation-7042627c84a8ef69.pdf", kind: "pdf", sizeBytes: 3332103 },
  { title: "Machine App Guide (Client)", file: "machine-app-guide-client-1ea87129d51b399a.pdf", kind: "pdf", sizeBytes: 8526782 },
  { title: "Machine App Technical Guide (Internal)", file: "machine-app-technical-guide-internal-bad6715de0df27e7.pdf", kind: "pdf", sizeBytes: 9987247 },
  { title: "MuscleBox Pro User Manual", file: "user-manual-4cd45ed592f888bf.pdf", kind: "pdf", sizeBytes: 4435063 },
  { title: "Machine Order Demo", file: "machine-order-demo-43df77295c9574a7.mp4", kind: "video", sizeBytes: 2874381 },
];

export const docUrl = (doc: StaticDoc): string => `${DOCS_ORIGIN}${DOCS_PATH}/${doc.file}`;
