import { useEffect } from "react";
import { useLocation } from "wouter";
import { setAccessToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

function extractTokenFromHash(hash: string): string | null {
  const cleaned = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(cleaned);
  return params.get("access_token");
}

export default function AuthCallback() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const tokenFromHash = extractTokenFromHash(window.location.hash);
    const tokenFromQuery = new URLSearchParams(window.location.search).get(
      "access_token",
    );
    const token = tokenFromHash ?? tokenFromQuery;

    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: "No access token returned from provider.",
      });
      setLocation("/login");
      return;
    }

    setAccessToken(token);
    toast({
      title: "Signed in successfully",
      description: "Your account is now connected.",
    });
    setLocation("/account");
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-gray-300">
      Finalizing sign-in...
    </div>
  );
}
