"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import Link from "next/link";
import { CheckCircle2, Activity, Heart, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const faqs = [
  { q: "Is protein good for diabetes management?", a: "Yes. Protein has minimal direct effect on blood glucose and helps slow digestion, reducing glucose spikes. Adequate protein also supports muscle mass, which improves insulin sensitivity." },
  { q: "How much protein should a diabetic eat per day?", a: "Most diabetes nutrition guidelines recommend protein make up 20–30% of total daily calories, roughly 1.0–1.5 grams per kilogram of body weight for optimal glycemic control." },
  { q: "Are protein shakes safe for diabetics?", a: "Yes. Low-sugar, high-quality protein shakes such as whey protein can be a safe and convenient option for diabetics. Always check the label for added sugars and consult your healthcare provider." },
  { q: "Which protein sources are best for people with diabetes?", a: "Lean sources like fish, chicken breast, eggs, Greek yogurt, lentils, chickpeas, and tofu are ideal. Plant proteins may also reduce diabetes risk more effectively than processed animal proteins." },
  { q: "Can diabetics with kidney disease eat high protein?", a: "People with diabetic nephropathy (kidney disease) may need to limit protein intake to avoid further kidney damage. Always consult a registered dietitian or healthcare provider before increasing protein." },
];

export default function BlogProteinDiabetes() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Article Hero ── */}
      <section className="bg-gray-950 pt-32 pb-0 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[240px] bg-gradient-to-r from-blue-500/15 to-primary/15 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center pb-10"
          >
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
              Health &amp; Nutrition
            </span>
            <h1
              className="font-display font-black text-white uppercase leading-none mb-5"
              style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}
            >
              Why protein is important for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                diabetes management
              </span>
            </h1>
            <div className="flex items-center justify-center gap-3 text-white/40 text-sm">
              <span>By Nutrition Science Team</span>
              <span>·</span>
              <span>7 min read</span>
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
              alt="Healthy protein sources for diabetes management"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/50 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      <main className="flex-1 bg-white">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          <p className="text-lg text-gray-700 leading-relaxed mb-10 font-medium">
            Diabetes is one of the fastest-growing health conditions worldwide. Managing blood sugar requires careful attention to diet — especially the balance of carbohydrates, fats, and protein. Research shows that adequate protein intake can help stabilize blood sugar, support muscle health, and improve overall metabolic control.
          </p>

          {/* Section 1 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-primary" />
            </span>
            1. How Protein Affects Blood Sugar
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Unlike carbohydrates, protein has a minimal direct effect on blood glucose. When consumed as part of a meal, protein slows digestion — reducing glucose spikes and increasing satiety. Evidence suggests it can improve glycemic control and support lean body mass in people with diabetes.
          </p>

          <blockquote className="bg-gray-50 border border-gray-200 border-l-4 border-l-primary rounded-r-xl rounded-l-none px-6 py-5 my-8">
            <p className="text-gray-600 text-sm leading-relaxed italic m-0">
              "According to research in the{" "}
              <a href="https://www.japi.org/article/japi-71-12-36" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Journal of the Association of Physicians of India
              </a>
              , protein can reduce the glycemic index of meals and help stabilize blood sugar."
            </p>
          </blockquote>

          {/* Section 2 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-red-500" />
            </span>
            2. Benefits of Protein for People With Diabetes
          </h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            Incorporating the right amount of protein into a diabetic diet offers multiple, scientifically-backed benefits:
          </p>
          <ul className="space-y-3 mb-8">
            {[
              { label: "Stabilizes blood sugar", text: "Protein reduces the overall glycemic index of a meal when paired with carbohydrates." },
              { label: "Maintains muscle mass", text: "More muscle mass naturally improves insulin sensitivity, making it easier for the body to process glucose." },
              { label: "Supports weight management", text: "Protein increases satiety and aids weight loss. Weight loss significantly improves glucose control, particularly in type-2 diabetes." },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm"><strong className="text-gray-900">{item.label}:</strong> {item.text}</span>
              </li>
            ))}
          </ul>

          {/* Section 3 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4">
            3. Best Sources of Protein for Diabetes
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Not all proteins are created equal. Focus on healthy, lean sources to avoid excess saturated fats that can negatively impact cardiovascular health.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 my-6">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <h4 className="font-bold text-gray-900 mb-3">Plant Proteins</h4>
              <ul className="text-gray-600 text-sm space-y-1.5">
                {["Lentils", "Chickpeas", "Tofu", "Soy products"].map(i => <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />{i}</li>)}
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <h4 className="font-bold text-gray-900 mb-3">Lean Animal Proteins</h4>
              <ul className="text-gray-600 text-sm space-y-1.5">
                {["Fish and seafood", "Eggs", "Chicken breast", "Greek yogurt, cottage cheese"].map(i => <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />{i}</li>)}
              </ul>
            </div>
          </div>
          <p className="text-sm text-gray-500 italic">
            Note: Research in the{" "}
            <a href="https://www.sciencedirect.com/science/article/pii/S0002916522031902" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              American Journal of Clinical Nutrition
            </a>{" "}
            indicates that plant protein may reduce diabetes risk more effectively than animal protein in some populations.
          </p>

          {/* Section 4 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4">
            4. Are Protein Shakes Safe for Diabetics?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Yes — low-sugar protein shakes can be a helpful and convenient addition to a diabetic diet. High-quality whey protein may improve the body's insulin response.
          </p>
          <p className="text-gray-600 leading-relaxed mb-8">
            In many modern gyms, fresh protein shakes are now available through automated{" "}
            <Link href="/gym-protein-shake-machine" className="text-primary hover:underline font-medium">protein shake vending machines</Link>
            , making it easier for people with diabetes to access balanced post-workout nutrition without the hidden sugars found in many commercial juice bars.
          </p>

          {/* Section 5 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4">
            5. How Much Protein Should Diabetics Eat?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            According to findings published in{" "}
            <a href="https://www.mdpi.com/1422-0067/25/20/10959" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Frontiers in Nutrition / MDPI
            </a>
            , higher protein intake can improve glycemic control and muscle mass in adults with diabetes.
          </p>
          <p className="text-gray-600 leading-relaxed mb-8">
            The typical recommendation is protein making up about <strong className="text-gray-900">20–30% of total daily calories</strong>, or roughly <strong className="text-gray-900">1.0–1.5 g per kg of body weight</strong> — a range commonly used in diabetes nutrition studies.
          </p>

          {/* Section 6 */}
          <h2 className="font-display font-black text-gray-900 uppercase text-2xl mt-12 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </span>
            6. Important Considerations
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            While protein is crucial, there are caveats. People with pre-existing <strong className="text-gray-900">kidney disease</strong> (diabetic nephropathy) may need to limit their protein intake to prevent further kidney damage. Always consult a healthcare provider or registered dietitian.
          </p>
          <p className="text-gray-600 leading-relaxed mb-8">
            Furthermore, some studies show that excessive intake of highly processed animal proteins (like processed meats) may actually <em>increase</em> diabetes risk. Focus on clean, whole-food sources.
          </p>

          <div className="h-px bg-gray-100 my-10" />

          <h2 className="font-display font-black text-gray-900 uppercase text-xl mb-4">Conclusion</h2>
          <p className="text-gray-600 leading-relaxed mb-12">
            Protein plays an important role in managing diabetes by supporting stable blood sugar levels, maintaining muscle mass, and promoting healthy metabolism. When combined with balanced carbohydrates and regular physical activity, protein-rich foods can help people with diabetes maintain better long-term health.
          </p>

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

          {/* Related articles */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-7">
            <p className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Read More</p>
            <div className="space-y-2">
              <Link href="/blog/why-gyms-need-vending-machines" className="flex items-center gap-2 text-primary hover:underline text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Why Every Gym Should Install a Protein Shake Vending Machine
              </Link>
              <Link href="/blog/best-protein-shake-after-workout" className="flex items-center gap-2 text-primary hover:underline text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                The Best Protein Shake After a Workout: Whey vs. Plant
              </Link>
            </div>
          </div>

        </article>
      </main>

      <Footer />
    </div>
  );
}
