"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FlaskConical, Leaf, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const faqs = [
  { q: "Is whey isolate better than whey concentrate?", a: "Yes, whey isolate undergoes further processing to remove most of the fat and lactose, resulting in a higher protein content per scoop and faster absorption compared to whey concentrate." },
  { q: "Do plant proteins build muscle as effectively as whey?", a: "Yes, studies show that as long as you consume adequate total daily protein and use a blend of plant sources to ensure a complete amino acid profile, plant proteins can build muscle just as effectively as whey." },
  { q: "Do your machines offer both whey and plant options?", a: "Absolutely. MuscleBoxPro automated shake dispensers allow gyms to offer multiple protein types, including premium whey isolate and vegan plant blends." },
];

export default function BlogBestProteinShake() {
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
              Nutrition Science
            </span>
            <h1
              className="font-display font-black text-white uppercase leading-none mb-5"
              style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}
            >
              The best protein shake after a workout:{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Whey vs. Plant
              </span>
            </h1>
            <div className="flex items-center justify-center gap-3 text-white/40 text-sm">
              <span>By MuscleBoxPro Nutrition Team</span>
              <span>·</span>
              <span>6 min read</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative rounded-2xl overflow-hidden aspect-video border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]"
          >
            <img
              src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
              alt="The Best Protein Shake After a Workout: Whey vs. Plant"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/50 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      <main className="flex-1 bg-white">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          <p className="text-lg text-gray-700 leading-relaxed mb-10 font-medium">
            You just crushed a heavy lifting session. Your muscles are fatigued, glycogen stores are depleted, and your body is primed to absorb nutrients. You know you need a protein shake — but what's the <em>best</em> option for optimal recovery and muscle growth?
          </p>

          <p className="text-gray-600 leading-relaxed mb-10">
            The debate between whey protein and plant-based protein has been going on for years. We're breaking down the science so you can make the right choice, whether you're blending at home or using a{" "}
            <Link href="/gym-protein-shake-machine" className="text-primary hover:underline font-medium">gym protein shake machine</Link>.
          </p>

          {/* Whey section */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </span>
            The Heavyweight Champion: Whey Protein
          </h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            Whey protein, derived from milk during the cheese-making process, has long been the gold standard in bodybuilding and athletic performance. But why is it so effective when dispensed from an{" "}
            <Link href="/protein-shake-vending-machine" className="text-primary hover:underline">automated shake dispenser</Link>?
          </p>
          <ul className="space-y-3 mb-6">
            {[
              { label: "Rapid Absorption", text: "Whey isolate is digested faster than almost any other protein source, flooding muscles with amino acids within 30 minutes." },
              { label: "High Leucine Content", text: "Leucine is the primary BCAA responsible for triggering Muscle Protein Synthesis (MPS). Whey is exceptionally high in leucine." },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm"><strong className="text-gray-900">{item.label}:</strong> {item.text}</span>
              </li>
            ))}
          </ul>

          {/* Whey quote */}
          <blockquote className="bg-gray-50 border border-gray-200 border-l-4 border-l-primary rounded-r-xl rounded-l-none px-6 py-5 my-8">
            <p className="text-gray-600 text-sm leading-relaxed italic m-0">
              "Research published in the{" "}
              <a href="https://academic.oup.com/ajcn/article/89/1/161/4598335" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                American Journal of Clinical Nutrition
              </a>{" "}
              demonstrates that whey protein stimulates muscle protein synthesis to a greater degree than other proteins like casein or soy at rest and after resistance exercise." — Tang et al., 2009
            </p>
          </blockquote>

          {/* Plant section */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 text-green-600" />
            </span>
            The Rising Star: Plant-Based Protein
          </h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            Plant-based proteins (pea, rice, hemp, or a blend) have surged in popularity — not just among vegans, but among all athletes looking for dairy-free alternatives that are easier on digestion.
          </p>
          <ul className="space-y-3 mb-6">
            {[
              { label: "Easier Digestion", text: "For those with lactose intolerance, plant protein eliminates the bloating often associated with cheap whey concentrates." },
              { label: "Complete Amino Acid Profiles", text: "High-quality blends combine sources (e.g., pea and rice) to create a profile comparable to whey." },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm"><strong className="text-gray-900">{item.label}:</strong> {item.text}</span>
              </li>
            ))}
          </ul>

          {/* Plant quote */}
          <blockquote className="bg-gray-50 border border-gray-200 border-l-4 border-l-green-500 rounded-r-xl rounded-l-none px-6 py-5 my-8">
            <p className="text-gray-600 text-sm leading-relaxed italic m-0">
              "A 2015 study in the{" "}
              <a href="https://jissn.biomedcentral.com/articles/10.1186/s12970-015-0087-9" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Journal of the International Society of Sports Nutrition
              </a>{" "}
              found that pea protein yielded similar results to whey protein in promoting muscle thickness during a 12-week resistance training program." — Babault et al., 2015
            </p>
          </blockquote>

          {/* Verdict */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-4 h-4 text-primary" />
            </span>
            The Verdict: Which is Better?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            From a purely biological standpoint, <strong className="text-gray-900">Whey Isolate</strong> slightly edges out plant protein due to its faster digestion rate and higher natural leucine content.
          </p>
          <p className="text-gray-600 leading-relaxed mb-8">
            However, <strong className="text-gray-900">Plant Protein</strong> yields virtually identical long-term muscle-building results, and is the clear winner for anyone with dairy sensitivities.
          </p>

          {/* MBP callout */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-7 my-8 text-center">
            <h3 className="font-display font-black text-gray-900 uppercase text-xl mb-3">Why choose when you can have both?</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              At MuscleBoxPro, our{" "}
              <Link href="/protein-vending-machine-india" className="text-primary hover:underline font-medium">smart protein kiosks</Link>{" "}
              are stocked with premium Whey Isolate <em>and</em> high-quality Vegan Plant blends — freshly mixed, perfectly chilled, and ready in 60 seconds via our{" "}
              <Link href="/gym-protein-shake-machine" className="text-primary hover:underline font-medium">automated supplement bars</Link>.
            </p>
          </div>

          <div className="h-px bg-gray-100 my-12" />

          {/* FAQ */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4 mb-12" itemScope itemType="https://schema.org/FAQPage">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:border-primary/20 transition-colors"
                itemScope itemProp="mainEntity" itemType="https://schema.org/Question"
              >
                <h3 className="font-bold text-gray-900 mb-2" itemProp="name">{faq.q}</h3>
                <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                  <p className="text-gray-600 text-sm leading-relaxed m-0" itemProp="text">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="rounded-2xl bg-gradient-to-r from-accent to-primary p-8 text-center">
            <h2 className="font-display font-black text-white uppercase text-2xl mb-3">
              Fuel your members' recovery
            </h2>
            <p className="text-white/80 text-sm mb-6 leading-relaxed">
              Give your members the post-workout nutrition they deserve while adding a highly profitable revenue stream to your facility.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="h-11 px-7 rounded-full font-bold bg-white text-primary hover:bg-white/90 border-0 cursor-pointer shadow-lg">
                <Link href="/gym-demo">Request a Demo Machine <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button asChild size="lg" className="h-11 px-7 rounded-full font-semibold bg-white/15 text-white border border-white/30 hover:bg-white/25 cursor-pointer">
                <Link href="/menu">View Our Menu</Link>
              </Button>
            </div>
          </div>

        </article>
      </main>

      <Footer />
    </div>
  );
}
