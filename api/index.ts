import { createApp } from "../server/app";

let app: Awaited<ReturnType<typeof createApp>>["app"];
try {
  const created = await createApp();
  app = created.app;
} catch (err) {
  console.error("[api] Failed to create app:", err);
  throw err;
}
export default app;
