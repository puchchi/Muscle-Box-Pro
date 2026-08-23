"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Mail, ShieldCheck, UserCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MBP_NOTICES } from "@shared/onboarding/agreementFields";

/**
 * What to do about a forgotten portal password.
 *
 * **This page used to be a lie, and the lie is the reason it is now prose.** It took an email
 * address, called a `forgot-password` edge function, and answered "if an account exists for
 * this email, a password reset link has been sent". No link was sent — there is no
 * transactional email sender wired up (§9.2 of the backend design records the reset mechanism
 * as built and its *delivery* as not). The brand panel went further and promised those links
 * expired after an hour. A gym owner locked out of their portal would enter their address,
 * read a confident confirmation, and then wait for a message that was never coming; the worst
 * version of this is the one where they wait instead of calling us.
 *
 * The `?token=` branch was broken in a second, quieter way. It rendered two password fields
 * and called `supabase.auth.updateUser({ password })` — which changes the password of
 * whatever session the browser already has and ignores the token entirely. With no session
 * it fails; with one it is not a reset at all.
 *
 * So: no form, and no promise. A reset is issued by a person, and this page's whole job is to
 * say so and name the way to reach one. The mechanism on the other end is real —
 * `POST /admin/gyms/{gymId}/set-password-link` mints a single-use handle, and
 * [/gym/set-password/[handle]](../../../../app/gym/set-password/[handle]/page.tsx) is where
 * that link lands — so what the copy below describes is what actually happens.
 *
 * **When SES is live this becomes a form again.** The thing to keep when it does is the
 * neutral confirmation: the message must not differ between an address we know and one we do
 * not, or the page becomes an oracle for which gyms are customers.
 */

const resetFacts = [
  {
    icon: UserCheck,
    text: "A person checks you're the account holder before any link is issued",
  },
  {
    icon: ShieldCheck,
    text: "The link works once, and only for setting a password",
  },
  {
    icon: Clock,
    text: "Same working day, in practice — we'll tell you when it's on its way",
  },
];

export default function GymForgotPassword() {
  return (
    <div className="min-h-screen flex">

      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-accent via-primary to-orange-500 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white translate-x-1/3 translate-y-1/3" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <Link href="/">
            <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-12 w-auto brightness-0 invert cursor-pointer" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative z-10"
        >
          <h2
            className="font-display font-black text-white uppercase leading-none mb-4"
            style={{ fontSize: "clamp(2.2rem, 3.5vw, 3.2rem)" }}
          >
            Locked out?{"\n"}
            <span className="text-white/80">Talk to us.</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10 max-w-xs">
            Your machine keeps trading and every cup keeps counting while you're out of the
            portal. Nothing you're owed depends on you being able to sign in.
          </p>

          <div className="space-y-4">
            {resetFacts.map((fact, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <fact.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-white/90 text-sm font-medium">{fact.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 text-white/40 text-xs"
        >
          © 2026 MuscleBoxPro. All rights reserved.
        </motion.p>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/">
              <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-10 w-auto mx-auto cursor-pointer" />
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
              Reset password
            </h1>
            <p className="text-muted-foreground text-sm">
              Ask us and we'll send you a link to set a new one
            </p>
          </div>

          {/*
            No email field. An input here would be indistinguishable from a self-service
            reset, and a gym owner who typed into one would reasonably then wait for an
            email. Waiting is the failure this page exists to prevent.
          */}
          <div
            className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
            data-testid="reset-by-request"
          >
            <p className="text-sm text-foreground leading-relaxed">
              Password resets for the partner portal are handled by a person rather than
              automatically. Email us from any address and say which gym you're with — we'll
              confirm you're the account holder and send you a one-time link to set a new
              password.
            </p>
            <a
              href={`mailto:${MBP_NOTICES.email}?subject=${encodeURIComponent(
                "Partner portal password reset",
              )}`}
              className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors break-all"
              data-testid="link-reset-email"
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              {MBP_NOTICES.email}
            </a>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed mt-4">
            Already been sent a link? Open it and it will take you straight to setting a new
            password — you don't need to come back here.
          </p>

          <Link href="/contact">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl font-semibold text-sm mt-6"
              data-testid="button-contact"
            >
              Other ways to reach us
            </Button>
          </Link>

          <Link href="/gym/login">
            <span className="mt-6 text-muted-foreground text-sm hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </span>
          </Link>
        </motion.div>
      </div>

    </div>
  );
}
