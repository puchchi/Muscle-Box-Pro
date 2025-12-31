import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import ShakeVariants from "@/components/home/ShakeVariants";
import { Monitor, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <ShakeVariants />
        
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
      <footer className="bg-black py-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm font-mono">
          © 2024 MUSCLE BOX PRO. ALL RIGHTS RESERVED.
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
