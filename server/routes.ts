import type { Express } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { demoRouter } from "./routes/demo";
import { campaignRouter } from "./routes/campaign";
import { contactRouter } from "./routes/contact";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const apiRouter = Router();
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const demoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const campaignLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  apiRouter.use("/auth", authLimiter, authRouter);
  apiRouter.use("/demo", demoLimiter, demoRouter);
  apiRouter.use("/campaign", campaignLimiter, campaignRouter);
  apiRouter.use("/contact", contactLimiter, contactRouter);
  apiRouter.use("/user", userRouter);
  app.use("/api", apiRouter);
  app.use("/api/index", apiRouter);

  return httpServer;
}
