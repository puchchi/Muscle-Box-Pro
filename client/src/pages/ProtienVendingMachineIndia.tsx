"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, MapPin, IndianRupee, Zap, Shield } from "lucide-react";

export default function ProteinVendingMachineIndia() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">INDIA'S #1 FITNESS AUTOMATION</Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-6">
              Start Your <span className="text-primary">Protein Vending Machine</span> Business in India
            </h1>
            <p className="text-gray-400 text-xl leading-relaxed max-w-3xl mx-auto">
              Capitalize on India's booming fitness industry. Our fully automated protein shake vending machines are designed for Indian gyms, featuring UPI integration, affordable maintenance, and high ROI.
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
              Why Install a <span className="text-primary">Protein Vending Machine in India?</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              With gym memberships rising across Tier 1 and Tier 2 cities in India, members demand premium, instant post-workout nutrition. 
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: IndianRupee, title: "High ROI in ₹", desc: "Low operational costs and premium shake pricing (₹80-₹120) lead to excellent margins." },
              { icon: Zap, title: "UPI & QR Payments", desc: "Seamless payment integration with PhonePe, Google Pay, Paytm, and local wallets." },
              { icon: Shield, title: "Pan-India Support", desc: "Reliable maintenance and supplement restocking networks across major Indian cities." },
              { icon: MapPin, title: "Small Footprint", desc: "Optimized for Indian gyms where floor space is premium. Generates high revenue per square foot." }
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
          <h2 className="font-display font-bold text-3xl text-white">The Booming Protein Vending Machine Business in India</h2>
          <p className="text-gray-400">
            India's fitness industry is growing at an unprecedented rate. As more Indians prioritize their health, gym owners are looking for innovative ways to increase revenue and improve member experience. A <strong>protein shake vending machine in India</strong> offers a zero-staff, high-margin business model that perfectly complements any fitness center.
          </p>
          
          <h3 className="font-display font-bold text-2xl text-white mt-12">Seamless UPI & Cashless Payments</h3>
          <p className="text-gray-400">
            In a digital-first economy, cash is no longer king. Our machines are fully integrated with India's UPI infrastructure. Whether your members use PhonePe, Google Pay, Paytm, or BHIM, they can purchase a chilled, freshly blended protein shake in under 45 seconds with a simple QR scan.
          </p>

          <ul className="space-y-4 my-8 text-gray-400 list-none pl-0">
            <li className="flex items-center gap-3">
              <CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" />
              <span><strong>100% Cashless:</strong> Fast checkout via dynamic UPI QR codes and cards.</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" />
              <span><strong>Premium Supplements:</strong> Top international and Indian whey protein brands available.</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" />
              <span><strong>Remote Management:</strong> Track sales in real-time from anywhere in India.</span>
            </li>
          </ul>

          <h3 className="font-display font-bold text-2xl text-white mt-12">Revenue Sharing Model</h3>
          <p className="text-gray-400">
            Beyond selling shakes, MuscleBoxPro protein vending machines in India include high-resolution digital displays. This allows gym owners to run localized ads, promote personal training packages, or share in the revenue from ad space sold to local Indian brands, creating a highly profitable secondary income stream with zero upfront cost.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-background mb-6">
            Ready to Bring the Future of Fitness to Your Gym?
          </h2>
          <p className="text-background/80 text-xl mb-10 max-w-2xl mx-auto">
            Join the fastest-growing network of automated fitness nutrition in India.
          </p>
          <Link href="/gym-demo">
            <Button size="lg" className="bg-background text-primary font-bold h-14 px-10 text-lg hover:bg-background/90 shadow-2xl">
              GET A QUOTE FOR YOUR GYM
            </Button>
          </Link>
        </div>
      </section>
      
      {/* Simple Footer for SEO Page */}
      <footer className="bg-black py-12 border-t border-white/10 text-center">
        <p className="text-gray-600 text-xs uppercase tracking-widest">
          © 2026 MUSCLE BOX PRO INDIA. ALL RIGHTS RESERVED.
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