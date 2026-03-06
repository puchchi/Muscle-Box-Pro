import "express-async-errors";
import express, { type Request, Response, NextFunction } from "express";
import cors, { type CorsOptions } from "cors";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { getAllowedOrigins } from "./config/env";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const allowedOrigins = getAllowedOrigins();

  const corsOptions: CorsOptions = {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error(`CORS blocked for origin: ${origin}`) as Error & {
        status?: number;
        code?: string;
      };
      error.status = 403;
      error.code = "CORS_ORIGIN_DENIED";
      callback(error);
    },
  };

  app.set("trust proxy", 1);
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

  app.use((req, res, next) => {
    const path = req.query.path;
    if (typeof path === "string" && path) {
      const qs = req.url?.includes("?") ? req.url.split("?")[1] ?? "" : "";
      const rest = qs ? "?" + qs.replace(/[&?]path=[^&]*/g, "").replace(/^&/, "") : "";
      req.url = `/api/index/${path}${rest}`;
      delete req.query.path;
    }
    next();
  });

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    console.error("[express] Error:", err?.message ?? err);
    if (err?.stack) console.error("[express] Stack:", err.stack);

    if (res.headersSent) {
      next(err);
      return;
    }

    if (err?.code === "CORS_ORIGIN_DENIED") {
      res.status(403).json({
        message: "CORS origin denied",
        allowedOrigins: Array.from(allowedOrigins),
      });
      return;
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    log(`error ${status}: ${message}`, "express:error");
  });

  return { app, httpServer };
}
