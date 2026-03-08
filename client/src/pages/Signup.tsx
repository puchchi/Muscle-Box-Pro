import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Dumbbell, Building2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

const userSignupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  mobile: z.string().min(10, "Valid mobile number is required"),
});

const gymContactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  address: z.string().min(8, "Address is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Invalid email address"),
});

export default function Signup() {
  const { toast } = useToast();
  const [accountType, setAccountType] = useState<"user" | "gym">("user");
  const [signupMessage, setSignupMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const userForm = useForm<z.infer<typeof userSignupSchema>>({
    resolver: zodResolver(userSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      mobile: "",
    },
  });

  const gymForm = useForm<z.infer<typeof gymContactSchema>>({
    resolver: zodResolver(gymContactSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  async function onUserSignup(values: z.infer<typeof userSignupSchema>) {
    setSignupMessage(null);

    const { data, error } = await supabase.functions.invoke("auth-signup", {
      body: {
        name: values.name,
        email: values.email,
        password: values.password,
        mobile: values.mobile,
      },
    });

    if (error) {
      setSignupMessage({
        type: "error",
        text: error.message || "Could not create account. Please try again.",
      });
      return;
    }

    setSignupMessage({
      type: "success",
      text:
        (data as { message?: string } | null)?.message ||
        "Verification link has been sent, please click on then login.",
    });
  }

  async function onGymContactSubmit(values: z.infer<typeof gymContactSchema>) {
    console.log("Gym owner lead submitted", values);
    toast({
      title: "Request Received",
      description: "Our team will contact you shortly to onboard your gym.",
    });
    gymForm.reset();
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
          <Tabs
            value={accountType}
            onValueChange={(value) => setAccountType(value as "user" | "gym")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-background border border-white/10">
              <TabsTrigger value="user" className="data-[state=active]:bg-primary data-[state=active]:text-background flex items-center gap-2">
                <User className="h-4 w-4" /> USER
              </TabsTrigger>
              <TabsTrigger value="gym" className="data-[state=active]:bg-primary data-[state=active]:text-background flex items-center gap-2">
                <Building2 className="h-4 w-4" /> GYM OWNER
              </TabsTrigger>
            </TabsList>

            <TabsContent value="user">
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit(onUserSignup)} className="space-y-6">
                  {signupMessage && (
                    <div
                      className={
                        signupMessage.type === "success"
                          ? "rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
                          : "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      }
                    >
                      {signupMessage.text}
                    </div>
                  )}

                  <FormField
                    control={userForm.control}
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
                    control={userForm.control}
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
                    control={userForm.control}
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
                    control={userForm.control}
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
            </TabsContent>

            <TabsContent value="gym">
              <Form {...gymForm}>
                <form onSubmit={gymForm.handleSubmit(onGymContactSubmit)} className="space-y-6">
                  <FormField
                    control={gymForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Gym owner name" {...field} className="bg-background/50 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={gymForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Gym address" {...field} className="bg-background/50 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={gymForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 98765 43210" {...field} className="bg-background/50 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={gymForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Email</FormLabel>
                        <FormControl>
                          <Input placeholder="owner@gym.com" type="email" {...field} className="bg-background/50 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-12 bg-primary text-background font-display font-bold text-lg hover:bg-primary/90">
                    CONTACT US
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

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
