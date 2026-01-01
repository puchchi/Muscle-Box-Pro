import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Dumbbell, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const { toast } = useToast();

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Reset Link Sent",
      description: "If an account exists, you will receive an email shortly.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <Link href="/">
            <span className="inline-flex items-center gap-2 group cursor-pointer mb-6">
              <div className="p-2 bg-primary rounded-lg group-hover:bg-primary/90 transition-colors">
                <Dumbbell className="h-5 w-5 text-background" />
              </div>
              <span className="font-display text-lg tracking-wider text-white">
                MUSCLE BOX<span className="text-primary">PRO</span>
              </span>
            </span>
          </Link>
          <h1 className="text-3xl font-display font-bold text-white mb-2 uppercase tracking-tighter">RESET PASSWORD</h1>
          <p className="text-gray-400">Enter your email to receive a recovery link</p>
        </div>

        <div className="bg-card border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-mono uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input 
                  type="email" 
                  placeholder="you@example.com" 
                  className="bg-background/50 border-white/10 pl-10 focus:border-primary" 
                  required 
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 bg-primary text-background font-display font-bold text-lg hover:bg-primary/90 transition-all">
              SEND RECOVERY LINK
            </Button>
          </form>

          <div className="text-center mt-6">
            <Link href="/account">
              <span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
