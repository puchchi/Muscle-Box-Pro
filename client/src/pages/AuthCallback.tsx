"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: "No session returned from provider.",
        });
        router.push("/login");
        return;
      }

      toast({
        title: "Signed in successfully",
        description: "Your account is now connected.",
      });
      router.push("/account");
    });
  }, [router, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-gray-300">
      Finalizing sign-in...
    </div>
  );
}
