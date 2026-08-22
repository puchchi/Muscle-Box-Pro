"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { hasAccessTokenSync } from "@/lib/auth";

export default function Navbar() {
  const location = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(hasAccessTokenSync());
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Gym Demo", path: "/gym-demo" },
    { name: "Specs", path: "/specs" },
    { name: "Advertise", path: "/advertise" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <span className="flex items-center gap-2 group cursor-pointer">
              <Image
                src="/assets/logo.png"
                alt="MuscleBoxPro"
                width={160}
                height={40}
                className="h-10 w-auto flex-shrink-0 group-hover:opacity-90 transition-opacity"
                priority
              />
              {/* <span className="font-display text-xl font-bold tracking-wider text-brand-gradient group-hover:opacity-90 transition-opacity">
                MUSCLEBOXPRO
              </span> */}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.path} href={link.path}>
                <span
                  className={`text-sm font-medium tracking-wide transition-colors hover:text-primary cursor-pointer ${
                    location === link.path ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link.name.toUpperCase()}
                </span>
              </Link>
            ))}
            <Link href={isLoggedIn ? "/gym/dashboard" : "/gym/login"}>
              <Button variant="default" className="bg-primary text-background hover:bg-primary/90 font-bold">
                {isLoggedIn ? "DASHBOARD" : "GYM LOGIN"}
              </Button>
            </Link>
          </div>

          {/* Mobile Nav */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-700">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-white border-l border-gray-200 w-[300px]">
                <div className="flex flex-col gap-6 mt-10">
                  {navLinks.map((link) => (
                    <Link key={link.path} href={link.path}>
                      <span
                        className={`text-lg font-display tracking-wider transition-colors hover:text-primary cursor-pointer block ${
                          location === link.path ? "text-primary" : "text-muted-foreground"
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {link.name.toUpperCase()}
                      </span>
                    </Link>
                  ))}
                  {/* The desktop bar carries this as a button; the sheet only
                      renders navLinks, so it needs its own entry. */}
                  <Link href={isLoggedIn ? "/gym/dashboard" : "/gym/login"}>
                    <span
                      className="text-lg font-display tracking-wider text-primary transition-colors hover:text-primary/80 cursor-pointer block"
                      onClick={() => setIsOpen(false)}
                    >
                      {isLoggedIn ? "DASHBOARD" : "GYM LOGIN"}
                    </span>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
