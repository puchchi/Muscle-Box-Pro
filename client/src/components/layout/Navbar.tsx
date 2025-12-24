import { Link, useLocation } from "wouter";
import { Menu, X, Dumbbell } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Gym Demo", path: "/gym-demo" },
    { name: "My Account", path: "/account" },
    { name: "Advertise", path: "/advertise" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <span className="flex items-center gap-2 group cursor-pointer">
              <div className="p-2 bg-primary rounded-lg group-hover:bg-primary/90 transition-colors">
                <Dumbbell className="h-6 w-6 text-background" />
              </div>
              <span className="font-display text-xl tracking-wider text-white group-hover:text-primary transition-colors">
                MUSCLE BOX<span className="text-primary">PRO</span>
              </span>
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
            <Button variant="default" className="bg-primary text-background hover:bg-primary/90 font-bold">
              GET STARTED
            </Button>
          </div>

          {/* Mobile Nav */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-card border-l border-white/10 w-[300px]">
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
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
