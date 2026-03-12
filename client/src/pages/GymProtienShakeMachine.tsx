"use client";
import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Zap, Activity, Droplets } from "lucide-react";

export default function GymProteinShakeMachine() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">AUTOMATED SHAKE DISPENSER</Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-6">
              The Ultimate <span className="text-primary">Gym Protein Shake Machine</span>
            </h1>
            <p className="text-gray-400 text-xl leading-relaxed max-w-3xl mx-auto">
              Upgrade your fitness center with our state-of-the-art automated shake dispenser. Deliver perfectly chilled, freshly blended post-workout shakes to your members in under 45 seconds.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/gym-demo">
                <Button size="lg" className="bg-primary text-background font-bold h-14 px-8 text-lg w-full sm:w-auto hover:bg-primary/90">
                  REQUEST MACHINE DEMO
                </Button>
              </Link>
              <Link href="/specs">
                <Button size="lg" variant="outline" className="border-white/10 text-white hover:bg-white/5 h-14 px-8 text-lg w-full sm:w-auto">
                  VIEW MACHINE SPECS
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 bg-card/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
              Why Your Fitness Center Needs an <span className="text-primary">Automated Shake Machine</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Replace messy, high-overhead juice bars with a self-cleaning, fully automated vending solution.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Activity, title: "Post-Workout Nutrition", desc: "Capitalize on the anabolic window. Members get instant access to premium whey isolate." },
              { icon: Zap, title: "Member Convenience", desc: "No lines, no waiting. Just scan, blend, and go with our seamless cashless payment system." },
              { icon: ShieldCheck, title: "Vending Automation", desc: "Zero staff required. The machine handles everything from ordering to dispensing and tracking." },
              { icon: Droplets, title: "Unmatched Hygiene", desc: "Built-in self-cleaning cycles after every single shake ensure perfect sanitation standards." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-background/50 border border-white/10 p-6 rounded-2xl"
              >
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-invert prose-lg">
          <h2 className="font-display font-bold text-3xl text-white">The Business Case for a Gym Protein Shake Machine</h2>
          <p className="text-gray-400">
            For decades, gym owners struggled with the logistics of providing on-site nutrition. Staffing a smoothie bar is expensive, and manual mixing leads to inconsistent quality and wasted inventory. A dedicated <strong>gym protein shake machine</strong> eliminates these hurdles entirely through intelligent vending automation.
          </p>
          
          <h3 className="font-display font-bold text-2xl text-white mt-12">Maximizing Gym Revenue Per Square Foot</h3>
          <p className="text-gray-400">
            Occupying less than one square meter of floor space, our automated shake dispenser is designed for maximum profitability. By offering premium, chilled post-workout shakes exactly when members need them most, you create a high-margin, passive revenue stream. Unlike traditional vending machines that sell low-margin snacks, protein shakes command premium pricing, drastically improving your ROI.
          </p>

          <ul className="space-y-4 my-8 text-gray-400 list-none pl-0">
            <li className="flex items-center gap-3">
              <CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" />
              <span><strong>Flawless Hygiene:</strong> Automated self-cleaning prevents bacteria buildup and ensures compliance with health standards.</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" />
              <span><strong>Ultimate Member Convenience:</strong> Seamless app integration and cashless payments make purchasing frictionless.</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" />
              <span><strong>Zero Overhead:</strong> No need to hire bartenders or staff. The machine runs 24/7.</span>
            </li>
          </ul>

          <h3 className="font-display font-bold text-2xl text-white mt-12">The Future of Vending Automation</h3>
          <p className="text-gray-400">
            Modern fitness centers require modern solutions. Our gym protein shake machine isn't just a dispenser; it's a smart kiosk. Equipped with remote telemetry, you can track inventory, monitor sales, and even run digital advertising campaigns right from the machine's high-definition display.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-background mb-6">
            Install an Automated Shake Dispenser Today
          </h2>
          <p className="text-background/80 text-xl mb-10 max-w-2xl mx-auto">
            Give your members the post-workout nutrition they crave and boost your bottom line.
          </p>
          <Link href="/gym-demo">
            <Button size="lg" className="bg-background text-primary font-bold h-14 px-10 text-lg hover:bg-background/90 shadow-2xl">
              GET MACHINE PRICING
            </Button>
          </Link>
        </div>
      </section>
      
      {/* Simple Footer for SEO Page */}
      <footer className="bg-black py-12 border-t border-white/10 text-center">
        <p className="text-gray-600 text-xs uppercase tracking-widest">
          © 2026 MUSCLE BOX PRO. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
}

function Badge({ children, className, variant }: any) {
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${className}`}>
      {children}
    </span>
  );
}