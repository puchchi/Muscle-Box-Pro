// @ts-ignore Deno npm specifier resolved during Supabase function bundling.
import { z } from "npm:zod@3.25.76";

export const demoRequestSchema = z.object({
  name: z.string().min(2, "Name is required"),
  gymName: z.string().min(2, "Gym name is required"),
  email: z.string().email("A valid email is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  location: z.string().min(2, "Location is required"),
  message: z.string().optional(),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
