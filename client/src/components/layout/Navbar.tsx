"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The marketing site's nav bar.
 *
 * **It does not know whether anyone is signed in, and it must not try to find out.** The
 * partner button used to read the Supabase session out of `localStorage` during render and
 * say "DASHBOARD" to a signed-in gym. The portal's session is an `HttpOnly` cookie now, which
 * script cannot read by design, so there is no synchronous answer left to give.
 *
 * The two ways to get one back are both worse than the label being plain. A session probe
 * here runs on every marketing page view — the home page, every city landing page, every blog
 * post — spending a request per visitor to change one word for the small fraction who are
 * partners. A mirrored non-`HttpOnly` cookie is a second copy of the truth that goes stale in
 * the one case that matters, a session revoked server-side.
 *
 * So the trigger always reads "LOGIN" and the menu always offers both portals, whoever is
 * looking. Each destination forwards an existing session straight to its dashboard, so a
 * signed-in partner gets one extra hop and lands where a "DASHBOARD" label would have
 * promised. **That forwarding effect in `GymLogin` and `FranchiseLogin` is what makes this
 * correct** — remove it and this menu starts sending partners to a login form they do not
 * need.
 *
 * It is a menu rather than two buttons because six labels plus one button already overflow a
 * 768px bar (see `navLinks`); a second button would push the same problem into the `lg`
 * breakpoint. The one extra click it costs a gym is the price of the franchise portal being
 * reachable at all.
 */
/**
 * The hint lines are not decoration. Someone who hosts a machine and someone who owns a
 * territory are different agreements with different portals, and the wrong guess ends at a
 * login form their password does not open.
 */
const PORTALS = [
  { href: "/gym/login", label: "Gym portal", hint: "A machine hosted at your gym" },
  { href: "/franchise/login", label: "Franchise portal", hint: "A territory you operate" },
] as const;

export default function Navbar() {
  const location = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Partnership sits next to Franchise because they are the two halves of the same
   * question — host a machine, or buy a territory — and it is the one for the larger
   * audience. It had been footer-only while Franchise had a nav slot.
   *
   * Six labels plus the login button overflow a 768px bar, which is why the desktop
   * strip below is `lg:` and tablets get the sheet. Adding a seventh needs the same
   * arithmetic done again, not just another array entry.
   */
  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Gym Demo", path: "/gym-demo" },
    { name: "Partnership", path: "/gym-partnership" },
    { name: "Franchise", path: "/franchise" },
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
          <div className="hidden lg:flex items-center gap-6">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  className="bg-primary text-background hover:bg-primary/90 font-bold cursor-pointer"
                  data-testid="button-login-menu"
                >
                  LOGIN
                  <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Partner sign in
                </DropdownMenuLabel>
                {PORTALS.map((portal) => (
                  <DropdownMenuItem
                    key={portal.href}
                    asChild
                    /*
                      The highlight has to be overridden, not inherited. `DropdownMenuItem`
                      ships `focus:bg-accent`, and `--accent` in this theme is the brand
                      magenta rather than the subtle hover grey shadcn assumes, so the
                      default paints a saturated pink band and leaves the hint line
                      unreadable on it. A low-alpha primary tint is what the rest of the
                      site hovers with.
                    */
                    className="min-h-11 cursor-pointer focus:bg-primary/10 focus:text-foreground"
                  >
                    {/*
                      `nofollow` because robots.txt disallows both paths. This bar is on every
                      indexable page, so without it every one of them points at a blocked path:
                      crawl budget spent on a fetch that returns nothing, and a "blocked by
                      robots.txt" discovery in Search Console per page. The same links in the
                      footer carry it for the same reason.
                    */}
                    <Link href={portal.href} rel="nofollow">
                      <span className="flex flex-col gap-0.5 py-1">
                        <span className="font-semibold text-sm">{portal.label}</span>
                        <span className="text-xs text-muted-foreground">{portal.hint}</span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Nav */}
          <div className="lg:hidden">
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
                  {/* The desktop bar carries these in a menu; the sheet only renders
                      navLinks, so they need their own entries. A menu inside a sheet is
                      two layers of disclosure for two links, so they are listed flat.
                      `nofollow` for the reason given on the desktop pair. */}
                  <div className="border-t border-gray-200 pt-6 flex flex-col gap-4">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                      Partner sign in
                    </span>
                    {PORTALS.map((portal) => (
                      <Link key={portal.href} href={portal.href} rel="nofollow">
                        <span
                          className="text-lg font-display tracking-wider text-primary transition-colors hover:text-primary/80 cursor-pointer block"
                          onClick={() => setIsOpen(false)}
                        >
                          {portal.label.toUpperCase()}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
