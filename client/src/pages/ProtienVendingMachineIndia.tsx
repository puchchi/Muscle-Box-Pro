"use client";
import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, MapPin, IndianRupee, Zap, Shield, MousePointerClick, RotateCw, CupSoda, ArrowRight } from "lucide-react";
import Footer from "@/components/footer";

type ProteinVendingMachineIndiaProps = {
  cityName?: string;
};

export default function ProteinVendingMachineIndia({
  cityName,
}: ProteinVendingMachineIndiaProps) {
  const locationLabel = cityName ?? "India";
  const isIndiaPage = !cityName;
  const locationKeyword = cityName
    ? `protein vending machine ${cityName.toLowerCase()}`
    : "protein vending machine India";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-gradient-to-r from-accent/25 to-primary/25 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="sr-only">{locationKeyword}</h1>
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6"
          >
            {locationLabel}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display font-black text-white uppercase leading-none mb-6"
            style={{ fontSize: "clamp(2.2rem, 5.5vw, 4.2rem)" }}
          >
            Protein Vending Machine<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              in {locationLabel} for Gyms
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/50 text-lg leading-relaxed max-w-2xl mx-auto mb-10"
          >
            {isIndiaPage
              ? "Fresh protein shakes, automatically blended in 60 seconds. Premium whey, real ingredients — no staff required."
              : `Fresh protein shakes, automatically blended in 60 seconds for gyms across ${locationLabel}. Premium whey, real ingredients — no staff required.`}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link href="/gym-demo">
              <Button size="lg" className="h-12 px-8 rounded-full font-bold bg-primary text-white hover:bg-primary/90 border-0 cursor-pointer shadow-lg shadow-primary/30">
                Request Machine Demo <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Machine Image ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-[21/9] rounded-3xl overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.25),0_8px_24px_-4px_rgba(0,0,0,0.15)] border border-gray-100 group">
            <img
              src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
              alt={`protein vending machine for gyms in ${locationLabel}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-8 left-8">
              <p className="text-white font-display font-black text-2xl uppercase tracking-tight">
                MuscleBoxPro · {locationLabel}
              </p>
              <p className="text-white/70 text-sm mt-1">Automated protein blending in under 60 seconds</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">

          {/* What is section */}
          <div className="mb-16">
            <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Overview</span>
            <h2 className="font-display font-black text-foreground uppercase mb-5" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
              What is a Protein Vending Machine?
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              A <strong className="text-gray-900">protein vending machine</strong> automatically blends protein powder, fruits and liquids to create fresh protein shakes on demand. These{" "}
              <Link href="/protein-shake-vending-machine" className="text-primary hover:text-primary/80 font-medium underline underline-offset-2">automated shake dispensers</Link>{" "}
              are typically installed in gyms, fitness centers, universities and sports complexes across India.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Unlike traditional vending machines that dispense packaged drinks, our{" "}
              <Link href="/gym-protein-shake-machine" className="text-primary hover:text-primary/80 font-medium underline underline-offset-2">gym protein shake machines</Link>{" "}
              prepare fresh shakes using an automated blending system right before your eyes.
            </p>
          </div>

          {/* Why gyms section */}
          <div className="mb-16">
            <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Benefits</span>
            <h2 className="font-display font-black text-foreground uppercase mb-4" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
              Why Gyms in {locationLabel} Are Installing Protein Vending Machines
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              {isIndiaPage
                ? "Gym owners across India are upgrading their facilities with automated solutions to provide better service and increase profitability. Whether it's a smart protein kiosk, a whey protein dispenser, or a fully automated supplement bar, the benefits are clear."
                : `Gym owners across ${locationLabel} are upgrading their facilities with automated solutions to provide better service and increase profitability.`}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Instant post-workout nutrition for members",
                "Hygienic shake preparation",
                "Automated dispensing",
                "Additional revenue stream",
                "Convenient supplement access",
              ].map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
                  <span className="text-gray-800 font-medium text-sm">{text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="mb-16">
            <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Process</span>
            <h2 className="font-display font-black text-foreground uppercase mb-8" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
              How a Protein Vending Machine Works
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { step: "01", title: "Select", desc: "Member selects a protein shake from the machine interface", icon: MousePointerClick, color: "text-blue-600", bg: "bg-blue-50" },
                { step: "02", title: "Blend", desc: "The machine automatically blends protein powder and ingredients", icon: RotateCw, color: "text-primary", bg: "bg-primary/8" },
                { step: "03", title: "Dispense", desc: "A fresh protein shake is dispensed within seconds", icon: CupSoda, color: "text-accent", bg: "bg-accent/10" },
              ].map((s) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 relative overflow-hidden"
                >
                  <span className="absolute top-4 right-4 font-display font-black text-5xl text-gray-100 leading-none select-none">{s.step}</span>
                  <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="mb-16">
            <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Features</span>
            <h2 className="font-display font-black text-foreground uppercase mb-8" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
              Features of the MuscleBoxPro Protein Vending Machine
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: Zap, text: "Automated protein blending in under 45 seconds" },
                { icon: IndianRupee, text: "Smart payment integration (UPI, Credit/Debit cards)" },
                { icon: Shield, text: "Self-cleaning system with hygienic ingredient containers" },
                { icon: CheckCircle2, text: "Customizable shake menu (Whey, Vegan, Flavors)" },
                { icon: CheckCircle2, text: "HD Digital display for advertising and gym announcements" },
                { icon: CheckCircle2, text: "Real-time inventory tracking and remote management" },
                { icon: CheckCircle2, text: "Compact footprint (less than 10 sq ft)" },
                { icon: CheckCircle2, text: "Temperature controlled to serve perfectly chilled shakes" },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
                >
                  <div className="w-9 h-9 bg-primary/8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    <f.icon className="text-primary h-4 w-4" />
                  </div>
                  <span className="text-gray-800 font-medium text-sm">{f.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Revenue banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-accent via-primary to-orange-500 rounded-3xl p-10 mb-16 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <IndianRupee className="w-48 h-48 text-white" />
            </div>
            <div className="relative z-10">
              <h2 className="font-display font-black text-white uppercase text-2xl mb-3">
                Protein Vending Machine Revenue for Gyms
              </h2>
              <p className="text-white/80 text-base leading-relaxed max-w-2xl">
                The cost of shake preparation is significantly lower than the selling price, creating high profit margins. A gym protein shake machine generates passive income for gyms with minimal staff involvement.
              </p>
            </div>
          </motion.div>

          {/* City links */}
          <div className="mb-16">
            <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">Coverage</span>
            <h2 className="font-display font-black text-foreground uppercase mb-4" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
              {isIndiaPage
                ? "Protein Vending Machines for Gyms Across India"
                : `Protein Vending Machine Services in ${locationLabel}`}
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              {isIndiaPage
                ? "We provide installation, maintenance, and supplement restocking for protein shake vending machines in major Indian cities. If you are looking for a reliable protein vending machine India partner, we support full rollout and operations, including:"
                : `We provide installation, maintenance, and supplement restocking for protein shake vending machines for gyms in ${locationLabel}. We also support rollout in major Indian cities, including:`}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "Delhi", slug: "delhi" },
                { name: "Mumbai", slug: "mumbai" },
                { name: "Bangalore", slug: "bangalore" },
                { name: "Hyderabad", slug: "hyderabad" },
                { name: "Pune", slug: "pune" },
                { name: "Chennai", slug: "chennai" },
                { name: "Ahmedabad", slug: "ahmedabad" },
                { name: "Kolkata", slug: "kolkata" },
                { name: "Chandigarh", slug: "chandigarh" },
                { name: "Gurgaon", slug: "gurgaon" },
                { name: "Noida", slug: "noida" },
              ].map(({ name, slug }) => (
                <Link
                  key={slug}
                  href={`/protein-vending-machine-${slug}`}
                  className="flex items-center gap-1.5 bg-primary/8 text-primary px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary hover:text-white transition-all duration-200 cursor-pointer"
                >
                  <MapPin className="h-3.5 w-3.5" /> {name}
                </Link>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">FAQ</span>
            <h2 className="font-display font-black text-foreground uppercase mb-8" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
              Protein Vending Machine FAQ
            </h2>
            <div className="space-y-3" itemScope itemType="https://schema.org/FAQPage">
              {[
                { q: "What is a protein vending machine?", a: "A protein vending machine is an automated kiosk that instantly mixes and dispenses fresh protein shakes, pre-workouts, and BCAAs using high-quality powder and chilled water or milk." },
                { q: "How long does it take to prepare a shake?", a: "Our advanced gym protein shake machines prepare a perfectly blended, clump-free shake in under 45 seconds." },
                { q: "Why install a protein vending machine in a gym?", a: "It provides convenient 24/7 post-workout nutrition for members, requires zero staff overhead, and creates a high-margin passive revenue stream for gym owners." },
                { q: "Are the shakes made from powder or ready-to-drink bottles?", a: "The machine automatically mixes premium whey or plant-based protein powder with chilled water or milk on demand, ensuring a fresher and more customizable drink than pre-packaged bottles." },
                { q: "How do members pay for the protein shakes?", a: "Our machines support multiple cashless payment options including UPI, credit/debit cards, and an integrated digital wallet through the MuscleBoxPro app." },
              ].map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white border border-gray-100 shadow-sm p-6 rounded-2xl hover:shadow-md transition-shadow"
                  itemScope itemProp="mainEntity" itemType="https://schema.org/Question"
                >
                  <h3 className="text-gray-900 font-bold text-base mb-2" itemProp="name">{faq.q}</h3>
                  <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                    <p className="text-gray-500 text-sm leading-relaxed m-0" itemProp="text">{faq.a}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 px-4 bg-gradient-to-r from-accent to-primary relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2
              className="font-display font-black text-white leading-none uppercase mb-5"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              Install a Protein Vending Machine{isIndiaPage ? " in Your Gym" : ` in Your ${locationLabel} Gym`}
            </h2>
            <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              If you are a gym owner looking to offer fresh protein shakes to your members, MuscleBoxPro provides a complete automated protein vending solution designed for modern fitness centers.
            </p>
            <Link href="/gym-demo">
              <Button size="lg" className="h-14 px-10 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 cursor-pointer text-base shadow-xl">
                Contact Us
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
