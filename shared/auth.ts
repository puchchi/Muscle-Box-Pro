import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  mobile: z.string().optional(),
  gymName: z.string().optional(),
});

export const signInSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const resendVerificationSchema = signInSchema;

export const forgotPasswordSchema = z.object({
  email: z.string().email("A valid email is required"),
  redirectTo: z.string().url().optional(),
});

export const googleUrlSchema = z.object({
  redirectTo: z.string().url().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
