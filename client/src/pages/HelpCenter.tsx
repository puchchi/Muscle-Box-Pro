"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";
import { HelpCircle, Search, CreditCard, Droplets, User, Wrench, MessageCircle, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";

const categories = [
  { icon: CreditCard, label: "Payments & Wallet", color: "text-blue-600", bg: "bg-blue-50", count: 3 },
  { icon: Droplets, label: "Shakes & Menu", color: "text-accent", bg: "bg-accent/10", count: 2 },
  { icon: User, label: "Account & Login", color: "text-purple-600", bg: "bg-purple-50", count: 2 },
  { icon: Wrench, label: "Technical Issues", color: "text-primary", bg: "bg-primary/10", count: 2 },
  { icon: HelpCircle, label: "Gym Owners", color: "text-green-600", bg: "bg-green-50", count: 3 },
];

const faqs = [
  {
    category: "Payments & Wallet",
    items: [
      { q: "How do I add funds to my wallet?", a: "Login to your account, tap 'Add Funds', select or enter an amount, and choose your preferred payment method: UPI, Card, or QR scan." },
      { q: "Which payment methods are accepted?", a: "We accept all major UPI apps (GPay, PhonePe, Paytm), debit/credit cards, and net banking. You can also preload the MuscleBoxPro wallet for faster checkouts at the machine." },
      { q: "Can I get a refund if a transaction fails?", a: "Yes. Failed transactions are automatically refunded to your original payment method within 3–5 business days. If not received, contact our support team with the order ID." },
    ],
  },
  {
    category: "Shakes & Menu",
    items: [
      { q: "Are the shakes freshly mixed?", a: "Yes! Every shake is mixed on-demand using our independent mechanical stirring system to ensure perfect consistency and freshness. There are no pre-mixed or stored batches." },
      { q: "How long does a shake take to prepare?", a: "Most shakes are ready in under 60 seconds. The exact time depends on the blend selected, but the machine will show a live countdown on screen." },
    ],
  },
  {
    category: "Account & Login",
    items: [
      { q: "I forgot my password. How do I reset it?", a: "On the login page, tap 'Forgot Password' and enter your registered email. You'll receive a reset link within a few minutes. Check your spam folder if it doesn't arrive." },
      { q: "Can I use one account on multiple machines?", a: "Yes. Your MuscleBoxPro account works across all our machines. Simply scan your QR code or enter your mobile number at any machine." },
    ],
  },
  {
    category: "Technical Issues",
    items: [
      { q: "What if my shake doesn't dispense?", a: "In the rare event of a technical issue, tap the 'Report Problem' button on the machine screen or in your order history in the app. Our team monitors machines 24/7 and you will receive a full refund." },
      { q: "The machine screen is unresponsive. What should I do?", a: "Please do not attempt to tamper with the machine. Contact our 24/7 support line or use the gym's front desk to report it. Our technicians typically respond within 2 hours." },
    ],
  },
  {
    category: "Gym Owners",
    items: [
      { q: "How can I get a MuscleBoxPro machine for my gym?", a: "Visit our Gym Demo page and fill out the request form. Our team will contact you within 24 hours to schedule a free demo and discuss installation, with zero upfront cost." },
      { q: "Who handles maintenance and restocking?", a: "We do. MuscleBoxPro handles all stocking, cleaning, technical maintenance, and software updates. You simply collect your revenue share each month." },
      { q: "How does the revenue share model work?", a: "Gym owners earn a percentage of every shake sold from their machine. Exact percentages depend on your location and member volume. Our team will walk you through the numbers during your demo." },
    ],
  },
];

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero with Search ── */}
      <section className="bg-gray-950 pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <div className="hero-rise">
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
              Support
            </span>
            <h1
              className="font-display font-black text-white uppercase leading-none mb-3"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
            >
              Help{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Center
              </span>
            </h1>
            <p className="text-white/50 text-sm mb-8">How can we help you today?</p>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5 pointer-events-none" />
              <Input
                className="bg-white border-0 pl-12 h-13 text-base rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/30 shadow-lg"
                placeholder="Search for answers..."
              />
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1">

        {/* ── Categories ── */}
        <section className="py-10 px-4 bg-gray-50 border-b border-gray-100">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((cat, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white border border-gray-100 rounded-2xl p-4 text-center hover:border-primary/20 hover:shadow-sm transition-all duration-200 cursor-pointer group"
              >
                <div className={`w-10 h-10 ${cat.bg} rounded-xl flex items-center justify-center mx-auto mb-2.5`}>
                  <cat.icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <p className="text-gray-900 font-semibold text-xs leading-tight">{cat.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{cat.count} articles</p>
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── FAQ Accordion ── */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="mb-10">
              <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">FAQ</span>
              <h2
                className="font-display font-black text-foreground uppercase"
                style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}
              >
                Frequently asked questions
              </h2>
            </div>

            <div className="space-y-8">
              {faqs.map((group, gi) => (
                <motion.div
                  key={gi}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: gi * 0.06 }}
                >
                  <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-3 pl-1">
                    {group.category}
                  </h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {group.items.map((faq, fi) => (
                      <AccordionItem
                        key={fi}
                        value={`${gi}-${fi}`}
                        className="border border-gray-100 bg-gray-50 rounded-2xl px-5 data-[state=open]:border-primary/20 data-[state=open]:bg-white transition-colors"
                      >
                        <AccordionTrigger className="hover:no-underline py-4 text-left">
                          <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 text-sm leading-relaxed pb-4">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contact CTA ── */}
        <section className="py-16 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2
                className="font-display font-black text-foreground uppercase mb-2"
                style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
              >
                Still need help?
              </h2>
              <p className="text-muted-foreground text-sm">Our support team is available 24/7.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              <a
                href="mailto:contact@muscleboxpro.com"
                className="bg-white border border-gray-100 rounded-2xl p-6 text-center hover:border-primary/20 hover:shadow-sm transition-all duration-200 cursor-pointer group"
              >
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <p className="font-bold text-gray-900 text-sm mb-1">Email Support</p>
                <p className="text-gray-500 text-xs">contact@muscleboxpro.com</p>
              </a>

              <Link
                href="/gym-demo"
                className="bg-white border border-gray-100 rounded-2xl p-6 text-center hover:border-primary/20 hover:shadow-sm transition-all duration-200 cursor-pointer group"
              >
                <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="font-bold text-gray-900 text-sm mb-1">Gym Owners</p>
                <p className="text-gray-500 text-xs">Request a demo machine</p>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
