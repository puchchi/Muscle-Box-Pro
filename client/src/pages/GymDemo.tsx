import Navbar from "@/components/layout/Navbar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  gymName: z.string().min(2, "Gym name is required"),
  email: z.string().email("Invalid email"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  location: z.string().min(2, "Location is required"),
  message: z.string().optional(),
});

export default function GymDemo() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      gymName: "",
      email: "",
      mobile: "",
      location: "",
      message: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // PROTOTYPE ONLY: Simulating API hit to backend
    console.log("Hitting API: POST http://127.0.0.1:9999/leads/demo-request", values);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: "Request Sent!",
      description: "We'll be in touch shortly to schedule your demo.",
    });
    form.reset();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          <div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">
              GET A MACHINE <br />
              <span className="text-primary">FOR YOUR GYM</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Increase member satisfaction and generate passive revenue. Our machines require zero maintenance from your staff. We handle stocking, cleaning, and service.
            </p>
            <ul className="space-y-4 mb-8">
              {["Free Installation", "Revenue Share Model", "Zero Maintenance", "Custom Branding Options"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-white">
                  <div className="h-2 w-2 bg-primary rounded-full" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card p-8 rounded-2xl border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-display font-bold text-white mb-6">Request a Free Demo</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="bg-background border-white/10 focus:border-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="gymName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Gym Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Iron Paradise" {...field} className="bg-background border-white/10 focus:border-primary" />
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
                      <FormLabel className="text-gray-300">Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} className="bg-background border-white/10 focus:border-primary" />
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
                      <FormLabel className="text-gray-300">Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 98765 43210" {...field} className="bg-background border-white/10 focus:border-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Gym Location</FormLabel>
                      <FormControl>
                        <Input placeholder="City, State" {...field} className="bg-background border-white/10 focus:border-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-primary text-background font-bold text-lg hover:bg-primary/90 h-12">
                  SUBMIT REQUEST
                </Button>
              </form>
            </Form>
          </div>

        </div>
      </div>
    </div>
  );
}
