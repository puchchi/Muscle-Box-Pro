import { Resend } from "resend";
import { requireEnv } from "./env.ts";

export function getResend() {
  return new Resend(requireEnv("RESEND_API_KEY"));
}
