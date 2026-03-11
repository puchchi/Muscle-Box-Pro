"use client";

import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import ShakeVariants from "@/components/home/ShakeVariants";
import { Monitor, TrendingUp, Users, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <section className="sr-only">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-6">
              What is a Protein Shake Vending Machine?
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-5">
              A protein shake vending machine automatically blends whey protein, fruits, and liquids to prepare fresh protein shakes instantly. These machines are increasingly used in gyms and fitness centers to provide members with convenient post-workout nutrition without requiring shaker bottles or manual preparation.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              MuscleBoxPro allows gym members to enjoy fresh protein shake blends in seconds while helping gym owners create an additional revenue stream through automated protein vending.
            </p>
          </div>
        </section>

        <section className="sr-only py-20 bg-card/30 border-y border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10">
              How the Protein Shake Vending Machine Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "1. Select your shake",
                  description:
                    "Gym members choose their preferred protein shake blend.",
                },
                {
                  title: "2. Automated blending",
                  description:
                    "The machine mixes whey protein, banana, dates or other ingredients automatically.",
                },
                {
                  title: "3. Fresh shake served",
                  description:
                    "A hygienic protein shake is prepared and dispensed within seconds.",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-white/10 bg-background/50 p-6"
                >
                  <h3 className="text-xl font-display font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sr-only py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-8">
              Why Gyms Install Protein Shake Vending Machines
            </h2>
            <ul className="space-y-3 text-gray-300 text-lg mb-8">
              <li>• Instant post-workout nutrition for gym members</li>
              <li>• No shaker bottles required</li>
              <li>• Additional revenue for fitness centers</li>
              <li>• Hygienic automated blending system</li>
              <li>• Convenient protein shake access inside the gym</li>
            </ul>
            <p className="text-gray-300 text-lg leading-relaxed">
              Protein shake vending machines improve the gym experience by providing convenient access to protein shakes immediately after workouts.
            </p>
          </div>
        </section>

        <ShakeVariants />

        <section className="sr-only py-20 border-y border-white/5 bg-card/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-6">
              Protein Shake Vending Machine for Gym Revenue
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-5">
              Installing a protein shake vending machine allows gyms to generate additional income by selling fresh protein shakes to members. Since the shakes are prepared automatically, gym staff do not need to manually mix drinks.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              This creates a passive revenue stream while improving member satisfaction.
            </p>
          </div>
        </section>

        <section className="sr-only">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2>Protein Shake Vending Machines for Gyms in India</h2>
            <p>
              MuscleBoxPro offers protein shake vending machines for gyms in India, helping fitness centers in cities like Delhi, Mumbai, Bengaluru, Hyderabad, Pune, and Chennai deliver instant post-workout nutrition.
            </p>
            <p>
              Our automated protein vending solution is built for Indian gym operations, enabling hygienic shake preparation, faster member service, and additional in-gym revenue.
            </p>
          </div>
        </section>
        
        {/* Ad Opportunity Section */}
        <section className="py-24 bg-card/30 border-y border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <Badge variant="outline" className="mb-4 border-primary/30 text-primary">ADVERTISING OPPORTUNITIES</Badge>
                <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
                  YOUR BRAND ON <br />
                  <span className="text-primary">EVERY SCREEN</span>
                </h2>
                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                  Our vending machines aren't just for shakes—they're high-impact digital billboards. 
                  Reach a captive, health-conscious audience during their most productive hour.
                </p>
                
                <div className="space-y-4 mb-8">
                  {[
                    { icon: Users, title: "Captive Audience", text: "Users spend 45s watching while their shake blends." },
                    { icon: Monitor, title: "HD 4K Displays", text: "Stunning visual impact in premium gym environments." },
                    { icon: TrendingUp, title: "Targeted Growth", text: "Connect with fitness enthusiasts at the point of sale." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="mt-1 p-2 bg-primary/10 rounded text-primary">
                        <item.icon size={20} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold">{item.title}</h4>
                        <p className="text-gray-400 text-sm">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/advertise">
                  <Button className="bg-primary text-background font-bold px-8 h-12">
                    BECOME A PARTNER
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative aspect-video rounded-2xl border border-white/10 overflow-hidden bg-black shadow-2xl shadow-primary/10"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Monitor size={80} className="text-primary/40 mx-auto mb-4 animate-pulse" />
                    <p className="font-display text-2xl text-white/60 tracking-widest">AD SPACE AVAILABLE</p>
                  </div>
                </div>
                {/* Mock UI Overlay */}
                <div className="absolute bottom-4 left-4 right-4 h-12 bg-white/5 backdrop-blur-md rounded border border-white/10 flex items-center px-4 justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary rounded-full" />
                    <div className="h-2 w-24 bg-white/20 rounded" />
                  </div>
                  <div className="h-2 w-12 bg-primary/40 rounded" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-black py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <span className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-primary rounded-lg">
                  <Dumbbell className="h-5 w-5 text-background" />
                </div>
                <span className="font-display text-lg tracking-wider text-white">
                  MUSCLE BOX<span className="text-primary">PRO</span>
                </span>
              </span>
              <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
                The ultimate on-demand nutrition solution for modern fitness centers. 
                Premium shakes, zero maintenance, maximum impact.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Company</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <Link href="/about"><li className="hover:text-primary cursor-pointer transition-colors">About Us</li></Link>
                <Link href="/specs"><li className="hover:text-primary cursor-pointer transition-colors">Our Machine</li></Link>
                <li className="hover:text-primary cursor-pointer transition-colors">Success Stories</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Support</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <Link href="/help"><li className="hover:text-primary cursor-pointer transition-colors">Help Center</li></Link>
                <Link href="/contact"><li className="hover:text-primary cursor-pointer transition-colors">Contact Us</li></Link>
                <Link href="/terms"><li className="hover:text-primary cursor-pointer transition-colors">Terms & Conditions</li></Link>
                <Link href="/privacy"><li className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</li></Link>
                <Link href="/refund-cancellation"><li className="hover:text-primary cursor-pointer transition-colors">Refund & Cancellation</li></Link>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-[10px] uppercase tracking-[0.2em]">
              © 2026 MUSCLE BOX PRO. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
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
