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

export const resendVerificationSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .min(1, "Email is required")
    .email("A valid email is required"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .min(1, "Email is required")
    .email("A valid email is required"),
});

export const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: "Reset token is required" })
    .trim()
    .min(1, "Reset token is required"),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
});

export const googleUrlSchema = z.object({
  redirectTo: z.string().url().optional(),
});

export const demoRequestSchema = z.object({
  name: z.string().min(2, "Name is required"),
  gymName: z.string().min(2, "Gym name is required"),
  email: z.string().email("A valid email is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  location: z.string().min(2, "Location is required"),
  message: z.string().optional(),
});

export const campaignRequestSchema = z.object({
  brandName: z.string().min(2, "Brand name is required"),
  email: z.string().email("A valid email is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
export type CampaignRequestInput = z.infer<typeof campaignRequestSchema>;
