// import { createApp } from "../server/app";

// let app: Awaited<ReturnType<typeof createApp>>["app"];
// try {
//   const created = await createApp();
//   app = created.app;
// } catch (err) {
//   console.error("[api] Failed to create app:", err);
//   throw err;
// }
// export default app;


import { createApp } from "../server/app";
import type { VercelRequest, VercelResponse } from "@vercel/node";

let appPromise = createApp();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { app } = await appPromise;
  return app(req, res);
}