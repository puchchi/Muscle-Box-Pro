"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Dumbbell, HelpCircle, Mail } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";

const quickLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/gym-demo", label: "Gym Demo", icon: Dumbbell },
  { href: "/help", label: "Help Center", icon: HelpCircle },
  { href: "/contact", label: "Contact Us", icon: Mail },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />

      <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center px-4 py-20">
        {/* Background radial glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Ghost "404" watermark */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-white/[0.03] select-none pointer-events-none leading-none"
          style={{ fontSize: "clamp(18rem, 40vw, 32rem)" }}
          aria-hidden="true"
        >
          404
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10 text-center max-w-xl w-full"
        >
          {/* Badge */}
          <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
            Error 404
          </span>

          {/* Headline */}
          <h1
            className="font-display font-black text-white uppercase leading-none mb-3"
            style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}
          >
            Page{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              Not Found
            </span>
          </h1>

          <p className="text-white/45 text-sm leading-relaxed mb-10 max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
            Try one of the shortcuts below.
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-7 rounded-xl hover:bg-primary/90 transition-colors text-sm cursor-pointer shadow-lg shadow-primary/25"
            >
              <Home className="w-4 h-4" />
              Go to Homepage
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold py-3 px-7 rounded-xl transition-colors text-sm cursor-pointer border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/25 text-xs font-semibold tracking-widest uppercase">Quick Links</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Quick nav tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl py-5 px-3 transition-all duration-200 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-white/70 group-hover:text-white text-xs font-semibold transition-colors">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
