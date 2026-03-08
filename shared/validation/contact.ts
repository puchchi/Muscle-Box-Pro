import { z } from "zod";

export const contactRequestSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("A valid email is required"),
  message: z.string().min(5, "Message is required"),
});

export type ContactRequestInput = z.infer<typeof contactRequestSchema>;
