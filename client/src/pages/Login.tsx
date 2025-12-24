import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().default(false),
});

export default function Login() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    console.log(values);
    toast({
      title: "Welcome Back!",
      description: "You've been logged in successfully.",
    });
    form.reset();
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/">
            <span className="inline-flex items-center gap-2 group cursor-pointer mb-6">
              <div className="p-2 bg-primary rounded-lg group-hover:bg-primary/90 transition-colors">
                <Dumbbell className="h-5 w-5 text-background" />
              </div>
              <span className="font-display text-lg tracking-wider text-white group-hover:text-primary transition-colors">
                MUSCLE BOX<span className="text-primary">PRO</span>
              </span>
            </span>
          </Link>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            SIGN IN
          </h1>
          <p className="text-gray-400">
            Access your account and check your balance
          </p>
        </div>

        {/* Login Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        type="email"
                        {...field}
                        className="bg-background/50 border-white/10 text-white placeholder:text-gray-600 focus:border-primary focus:bg-background/70 transition-colors h-11"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-white font-medium">Password</FormLabel>
                      <Link href="/forgot-password">
                        <span className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer">
                          Forgot?
                        </span>
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        {...field}
                        className="bg-background/50 border-white/10 text-white placeholder:text-gray-600 focus:border-primary focus:bg-background/70 transition-colors h-11"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Remember Me */}
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        data-testid="checkbox-remember"
                      />
                    </FormControl>
                    <FormLabel className="text-gray-400 text-sm font-normal cursor-pointer">
                      Remember me for 30 days
                    </FormLabel>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-primary text-background font-display font-bold text-lg hover:bg-primary/90 transition-colors mt-8"
                data-testid="button-login"
              >
                SIGN IN
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-gray-500">OR</span>
            </div>
          </div>

          {/* Guest Access */}
          <Button
            variant="outline"
            className="w-full h-12 border-primary/30 text-primary hover:bg-primary/10 font-bold"
            data-testid="button-guest"
          >
            CONTINUE AS GUEST
          </Button>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Don't have an account?{" "}
            <Link href="/signup">
              <span className="text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium">
                Sign up here
              </span>
            </Link>
          </p>
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl"
        >
          <p className="text-xs text-gray-400 leading-relaxed">
            <strong className="text-primary">Demo Credentials:</strong> Use any email and password (minimum 6 characters). This is a mockup—no authentication is required.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
