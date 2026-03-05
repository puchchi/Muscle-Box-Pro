import { Router } from "express";
import { SignJWT, jwtVerify } from "jose";
import {
  forgotPasswordSchema,
  googleUrlSchema,
  resendVerificationSchema,
  signInSchema,
  signUpSchema,
} from "@shared/auth";
import { supabase, supabaseAdmin } from "../lib/supabase";
import {
  env,
  getBackendPublicUrl,
  getCustomEmailConfigErrors,
} from "../config/env";
import { requireAuth } from "../middleware/auth";
import { sendVerificationEmail } from "../lib/email";

export const authRouter = Router();
const verificationSecret = new TextEncoder().encode(
  env.EMAIL_VERIFICATION_SECRET ?? "",
);

async function createVerificationToken(payload: { userId: string; email: string }) {
  const ttlMinutes = Number(env.EMAIL_VERIFICATION_TTL_MINUTES || "60");
  return new SignJWT({
    type: "email_verification",
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${ttlMinutes}m`)
    .sign(verificationSecret);
}

async function sendCustomVerificationForUser(input: {
  userId: string;
  email: string;
  name?: string;
}) {
  const token = await createVerificationToken({
    userId: input.userId,
    email: input.email,
  });
  const verifyUrl = `${getBackendPublicUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  await sendVerificationEmail({
    to: input.email,
    name: input.name,
    verificationUrl: verifyUrl,
  });
}

authRouter.post("/signup", async (req, res) => {
  const missingConfig = getCustomEmailConfigErrors();
  if (missingConfig.length > 0) {
    res.status(500).json({
      message: `Custom email verification is not configured. Missing: ${missingConfig.join(", ")}`,
    });
    return;
  }

  const parsed = signUpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }

  const { name, email, password, mobile, gymName } = parsed.data;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      full_name: name,
      mobile,
      gym_name: gymName,
      account_type: gymName ? "gym" : "user",
    },
  });

  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  if (!data.user) {
    res.status(500).json({ message: "Unable to create user." });
    return;
  }

  try {
    await sendCustomVerificationForUser({
      userId: data.user.id,
      email,
      name,
    });
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error
          ? `Unable to send verification email: ${error.message}`
          : "Unable to send verification email right now.",
    });
    return;
  }

  res.status(201).json({
    message: "Signup successful. Please verify your email to activate your account.",
    session: null,
    user: data.user,
  });
});

authRouter.get("/verify-email", async (req, res) => {
  const token =
    typeof req.query.token === "string" ? req.query.token : undefined;
  if (!token) {
    res.status(400).json({ message: "Missing verification token" });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, verificationSecret, {
      algorithms: ["HS256"],
    });
    if (payload.type !== "email_verification") {
      res.status(400).json({ message: "Invalid verification token type" });
      return;
    }

    const userId = payload.sub;
    if (!userId) {
      res.status(400).json({ message: "Invalid verification token payload" });
      return;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }

    res.redirect(`${env.FRONTEND_URL}/login?verified=1`);
  } catch (_error) {
    res.status(400).json({ message: "Verification token is invalid or expired" });
  }
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

  if (!data.user?.email_confirmed_at) {
    res.status(403).json({
      message: "Email not verified. Please verify your email before logging in.",
      code: "EMAIL_NOT_CONFIRMED",
      email,
    });
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

authRouter.post("/resend-verification", async (req, res) => {
  const missingConfig = getCustomEmailConfigErrors();
  if (missingConfig.length > 0) {
    res.status(500).json({
      message: `Custom email verification is not configured. Missing: ${missingConfig.join(", ")}`,
    });
    return;
  }

  const parsed = resendVerificationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid payload",
    });
    return;
  }

  const { email } = parsed.data;
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) {
    res.status(500).json({ message: "Unable to process verification request." });
    return;
  }

  const matchedUser = data.users.find(
    (user) => (user.email ?? "").toLowerCase() === email.toLowerCase(),
  );

  // Return generic success for unknown users to avoid account enumeration.
  if (!matchedUser) {
    res.json({
      message: "If your account exists, a verification link has been sent.",
    });
    return;
  }

  if (matchedUser.email_confirmed_at) {
    res.status(400).json({ message: "Email is already verified. Please login." });
    return;
  }

  try {
    await sendCustomVerificationForUser({
      userId: matchedUser.id,
      email: matchedUser.email ?? email,
      name:
        (matchedUser.user_metadata?.full_name as string | undefined) ??
        (matchedUser.user_metadata?.name as string | undefined),
    });
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error
          ? `Unable to send verification email: ${error.message}`
          : "Unable to send verification email right now.",
    });
    return;
  }

  res.json({
    message: "Verification link has been sent, please click on then login.",
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
