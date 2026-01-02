import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Dumbbell, Building2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const signupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  gymName: z.string().optional(),
});

export default function Signup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      mobile: "",
      gymName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    // PROTOTYPE ONLY: Simulating API hit to backend
    console.log("Hitting API: POST http://127.0.0.1:9999/auth/signup", values);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: "Account Created!",
      description: "Welcome to Muscle Box Pro.",
    });
    setLocation(values.gymName ? "/advertise" : "/account");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <Link href="/">
            <span className="inline-flex items-center gap-2 group cursor-pointer mb-6">
              <div className="p-2 bg-primary rounded-lg group-hover:bg-primary/90">
                <Dumbbell className="h-5 w-5 text-background" />
              </div>
              <span className="font-display text-lg tracking-wider text-white">
                MUSCLE BOX<span className="text-primary">PRO</span>
              </span>
            </span>
          </Link>
          <h1 className="text-3xl font-display font-bold text-white mb-2">JOIN THE PROS</h1>
          <p className="text-gray-400">Choose your account type to get started</p>
        </div>

        <div className="bg-card border border-white/10 rounded-2xl p-8 shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="user" className="w-full mb-6">
                <TabsList className="grid w-full grid-cols-2 bg-background border border-white/10">
                  <TabsTrigger value="user" className="data-[state=active]:bg-primary data-[state=active]:text-background flex items-center gap-2">
                    <User className="h-4 w-4" /> USER
                  </TabsTrigger>
                  <TabsTrigger value="gym" className="data-[state=active]:bg-primary data-[state=active]:text-background flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> GYM OWNER
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} className="bg-background/50 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" type="email" {...field} className="bg-background/50 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98765 43210" {...field} className="bg-background/50 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Password</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" {...field} className="bg-background/50 border-white/10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-12 bg-primary text-background font-display font-bold text-lg hover:bg-primary/90">
                CREATE ACCOUNT
              </Button>
            </form>
          </Form>

          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              Already have an account? <Link href="/login"><span className="text-primary cursor-pointer hover:underline">Sign in</span></Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
