"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg border-white/10 bg-card/70 backdrop-blur">
        <CardContent className="pt-8 pb-8">
          <div className="flex mb-4 gap-3 items-center">
            <AlertCircle className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-white">404 - Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-300 leading-relaxed">
            The page you are looking for does not exist or may have moved. Head
            back to the homepage to continue browsing.
          </p>

          <div className="mt-8">
            <Link href="/">
              <Button className="bg-primary text-background font-bold">
                Go to Homepage
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
