let appPromise: Promise<{ app: (req: any, res: any) => void }> | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      appPromise = import("../server/app").then((m) => m.createApp());
    }
    const { app } = await appPromise;
    return app(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("FUNCTION_INVOCATION_FAILED:", message, err);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal Server Error",
        detail: message,
      });
    }
  }
}
