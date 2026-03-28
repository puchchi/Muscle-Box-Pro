"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, TrendingUp, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const faqs = [
  {
    q: "How much floor space does a gym protein shake machine require?",
    a: "MuscleBoxPro machines are designed with a compact footprint, requiring less than 10 square feet (about 1 square meter) of floor space.",
  },
  {
    q: "Do I need to hire staff to run the machine?",
    a: "No. Our automated supplement bars are fully self-sufficient. They handle transactions, blending, and even run their own internal self-cleaning cycles.",
  },
  {
    q: "What is the average ROI for a protein vending machine?",
    a: "Because the cost of ingredients is low and retail prices for fresh shakes are premium, gyms typically enjoy a 70%+ gross margin per shake, often recovering their investment within months.",
  },
];

export default function BlogWhyGymVending() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Article Hero ── */}
      <section className="bg-gray-950 pt-32 pb-0 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[240px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center pb-10"
          >
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
              Gym Owner Guide
            </span>
            <h1
              className="font-display font-black text-white uppercase leading-none mb-5"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              Why every gym should install a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                protein shake vending machine
              </span>
            </h1>
            <div className="flex items-center justify-center gap-3 text-white/40 text-sm">
              <span>By MuscleBoxPro Team</span>
              <span>·</span>
              <span>5 min read</span>
            </div>
          </motion.div>

          {/* Featured image spanning into white section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative rounded-2xl overflow-hidden aspect-video border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]"
          >
            <img
              src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
              alt="Why Every Gym Should Install a Protein Shake Vending Machine"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/50 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      <main className="flex-1 bg-white">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Lead */}
          <p className="text-lg text-gray-700 leading-relaxed mb-10 font-medium">
            The fitness industry is evolving rapidly. Today's gym members expect more than just weights and treadmills — they want a seamless, premium experience. Enter the{" "}
            <Link href="/protein-shake-vending-machine" className="text-primary hover:underline font-semibold">
              automated protein shake vending machine
            </Link>
            : a game-changer transforming unused floor space into a significant revenue stream while skyrocketing member satisfaction.
          </p>

          {/* Section 1 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-4">
            1. The ultimate post-workout convenience
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            The{" "}
            <a href="https://jissn.biomedcentral.com/articles/10.1186/1550-2783-10-5" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              "anabolic window"
            </a>
            {" "}— that critical 30–45 minute period after a workout when muscles crave protein — is well known to fitness enthusiasts. However, bringing shaker bottles, messy powders, and warm water to the gym is a hassle most members hate. For more details on recovery nutrition, see our guide on the{" "}
            <Link href="/blog/best-protein-shake-after-workout" className="text-primary hover:underline">
              best post-workout shakes
            </Link>.
          </p>
          <p className="text-gray-600 leading-relaxed mb-8">
            A{" "}
            <Link href="/gym-protein-shake-machine" className="text-primary hover:underline">
              gym protein shake machine
            </Link>{" "}
            solves this instantly. With a few taps on a screen, members get a perfectly chilled, freshly blended, clump-free protein shake exactly when their bodies need it most.
          </p>

          {/* Revenue callout */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-7 my-8 relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-1">Revenue Fact</p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Gyms that install automated protein dispensers report an average{" "}
                  <strong className="text-primary">120% increase</strong> in supplement sales compared to selling tubs of powder at the front desk.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4">
            2. Zero staff overhead, 24/7 operation
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Traditional juice bars require staffing, training, inventory management, and health code compliance. They often operate at a loss during off-peak hours and are closed entirely during early mornings or late nights.
          </p>
          <p className="text-gray-600 leading-relaxed mb-8">
            MuscleBoxPro machines run 24/7. Whether a member finishes a workout at 5 PM or 2 AM, a perfect shake is always available. The machine handles transactions, the blending, and even the self-cleaning.
          </p>

          {/* Section 3 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4">
            3. High margins and passive income
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Selling premium, freshly blended shakes commands a much higher price point than pre-packaged RTD bottles, while the cost of goods sold remains incredibly low.
          </p>
          <ul className="space-y-3 mb-8">
            {[
              "Average selling price: ₹75–₹140 per shake",
              "Cost per shake: ₹45–₹70",
              "Gross margin: 50%+",
              "Square footage required: Less than 10 sq ft",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">{item}</span>
              </li>
            ))}
          </ul>

          {/* Section 4 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4">
            4. Boosting member retention
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8">
            Retention is the lifeblood of any fitness club. Members who consume adequate protein post-workout see better results, recover faster, and experience less soreness. By making nutrition frictionless, you are actively participating in your members' success — which translates directly to higher retention rates.
          </p>

          {/* Section 5 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4">
            5. The "cool factor" and modern aesthetics
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8">
            First impressions matter. When a prospective member tours your facility and sees a high-tech, glowing robotic{" "}
            <Link href="/protein-vending-machine-india" className="text-primary hover:underline">
              whey protein dispenser
            </Link>{" "}
            creating custom blends, it immediately elevates the perceived value of your gym — signaling that your facility is modern, innovative, and invested in premium amenities.
          </p>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-12" />

          {/* FAQ */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-6">
            Vending machine installation FAQ
          </h2>
          <div className="space-y-4 mb-12" itemScope itemType="https://schema.org/FAQPage">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:border-primary/20 transition-colors"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <h3 className="font-bold text-gray-900 mb-2" itemProp="name">{faq.q}</h3>
                <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                  <p className="text-gray-600 text-sm leading-relaxed m-0" itemProp="text">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Conclusion CTA */}
          <div className="rounded-2xl bg-gradient-to-r from-accent to-primary p-8 text-center">
            <h2 className="font-display font-black text-white uppercase text-2xl mb-3">
              Ready to upgrade your gym floor?
            </h2>
            <p className="text-white/80 text-sm mb-6 leading-relaxed">
              Stop leaving money on the table. Transform 10 sq ft of your gym into a highly profitable, 24/7 automated supplement bar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="h-11 px-7 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 cursor-pointer shadow-lg">
                <Link href="/gym-demo">Request a Demo Machine <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button asChild size="lg" className="h-11 px-7 rounded-full font-semibold bg-white/15 text-white border border-white/30 hover:bg-white/25 cursor-pointer">
                <Link href="/contact">Speak to Sales</Link>
              </Button>
            </div>
          </div>

        </article>
      </main>

      <Footer />
    </div>
  );
}
