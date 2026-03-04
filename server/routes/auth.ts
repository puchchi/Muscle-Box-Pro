import { Router } from "express";
import {
  forgotPasswordSchema,
  googleUrlSchema,
  signInSchema,
  signUpSchema,
} from "@shared/auth";
import { supabase } from "../lib/supabase";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const parsed = signUpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }

  const { name, email, password, mobile, gymName } = parsed.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        mobile,
        gym_name: gymName,
      },
      emailRedirectTo: `${env.FRONTEND_URL}/auth/callback`,
    },
  });

  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  res.status(201).json({
    message: "Signup successful. Verify your email if confirmation is enabled.",
    session: data.session
      ? {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresIn: data.session.expires_in,
          tokenType: data.session.token_type,
        }
      : null,
    user: data.user,
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = signInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }

  const { email, password } = parsed.data;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    res.status(401).json({ message: error?.message ?? "Invalid credentials" });
    return;
  }

  res.json({
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      tokenType: data.session.token_type,
    },
    user: data.user,
  });
});

authRouter.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }

  const { email, redirectTo } = parsed.data;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo ?? `${env.FRONTEND_URL}/login`,
  });

  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  res.json({ message: "Password reset email sent if the account exists." });
});

authRouter.get("/google-url", async (req, res) => {
  const parsed = googleUrlSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid query" });
    return;
  }

  const { redirectTo } = parsed.data;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo ?? `${env.FRONTEND_URL}/auth/callback`,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    res.status(400).json({ message: error?.message ?? "Could not create OAuth URL" });
    return;
  }

  res.json({ url: data.url });
});

authRouter.get("/session", requireAuth, async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  res.json({
    user: req.authUser,
  });
});

authRouter.post("/logout", (_req, res) => {
  res.status(204).send();
});
