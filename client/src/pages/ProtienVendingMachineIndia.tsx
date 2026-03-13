"use client";
import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, MapPin, IndianRupee, Zap, Shield, MousePointerClick, RotateCw, CupSoda } from "lucide-react";
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
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="sr-only">{locationKeyword}</h1>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-6 leading-tight">
              <span className="text-primary">Protein Vending Machine</span> in {locationLabel} for Gyms
              </h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <p className="text-gray-400 text-xl leading-relaxed max-w-3xl mx-auto">
                {isIndiaPage
                  ? "Protein vending machine India demand is growing rapidly in gyms and fitness centers. These machines automatically prepare fresh protein shakes using premium whey protein and natural ingredients, allowing gym members to enjoy convenient post-workout nutrition."
                  : `Protein vending machine demand is growing rapidly in gyms and fitness centers across ${locationLabel}. These machines automatically prepare fresh protein shakes using premium whey protein and natural ingredients, allowing gym members to enjoy convenient post-workout nutrition.`}
              </p>
              <p className="text-gray-400 text-xl leading-relaxed max-w-3xl mx-auto mt-4">
                {isIndiaPage
                  ? "MuscleBoxPro provides a smart protein vending machine designed specifically for gyms. The system blends protein shakes instantly and dispenses them hygienically without requiring manual preparation. For gym owners, installing a protein vending machine India setup creates an additional revenue stream while improving the overall gym experience."
                  : `MuscleBoxPro provides a smart protein vending machine designed specifically for gyms. The system blends protein shakes instantly and dispenses them hygienically without requiring manual preparation. For gym owners in ${locationLabel}, installing a protein vending machine setup creates an additional revenue stream while improving the overall gym experience.`}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/gym-demo">
                <Button size="lg" className="bg-primary text-background font-bold h-14 px-8 text-lg w-full sm:w-auto hover:bg-primary/90 shadow-[0_0_20px_rgba(0,209,255,0.4)]">
                  REQUEST MACHINE DEMO
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Image Section */}
      <section className="py-16 bg-black relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="relative aspect-[21/9] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,209,255,0.15)] group">
             <img 
              src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png" 
              alt={`protein vending machine for gyms in ${locationLabel}`} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          </div>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="py-24 bg-card/30 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-invert prose-lg">
          
          <h2 className="font-display font-bold text-3xl text-white">What is a Protein Vending Machine?</h2>
          <p className="text-gray-400">
            A <strong>protein vending machine</strong> automatically blends protein powder, fruits and liquids to create fresh protein shakes on demand. These <Link href="/protein-shake-vending-machine" className="text-primary hover:underline">automated shake dispensers</Link> are typically installed in gyms, fitness centers, universities and sports complexes across India.
          </p>
          <p className="text-gray-400">
            Unlike traditional vending machines that dispense packaged drinks, our <Link href="/gym-protein-shake-machine" className="text-primary hover:underline">gym protein shake machines</Link> prepare fresh shakes using an automated blending system right before your eyes.
          </p>

          <h2 className="font-display font-bold text-3xl text-white mt-16 mb-6">Why Gyms in {locationLabel} Are Installing Protein Vending Machines</h2>
          <p className="text-gray-400 mb-8">
            {isIndiaPage
              ? `Gym owners across India are upgrading their facilities with automated solutions to provide better service and increase profitability. Whether it's a smart protein kiosk, a whey protein dispenser, or a fully automated supplement bar, the benefits are clear.`
              : `Gym owners across ${locationLabel} are upgrading their facilities with automated solutions to provide better service and increase profitability.`}
          </p>
          <div className="grid sm:grid-cols-2 gap-4 not-prose my-8">
            {[
              "Instant post-workout nutrition for members",
              "Hygienic shake preparation",
              "Automated dispensing",
              "Additional revenue stream",
              "Convenient supplement access"
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-4 bg-black/40 p-5 rounded-xl border border-white/5 hover:border-primary/30 transition-colors">
                <CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 font-medium">{text}</span>
              </div>
            ))}
          </div>

          <h2 className="font-display font-bold text-3xl text-white mt-16">How a Protein Vending Machine Works</h2>
          <div className="grid md:grid-cols-3 gap-6 my-8 not-prose">
            {[
              { step: "1", title: "Select", desc: "Member selects a protein shake from the machine interface", icon: MousePointerClick },
              { step: "2", title: "Blend", desc: "The machine automatically blends protein powder and ingredients", icon: RotateCw },
              { step: "3", title: "Dispense", desc: "A fresh protein shake is dispensed within seconds", icon: CupSoda }
            ].map((s) => (
              <div key={s.step} className="bg-background/50 border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                <span className="absolute -top-4 -right-4 text-8xl font-display font-bold text-white/5">{s.step}</span>
                <s.icon className="text-primary h-8 w-8 mb-4 relative z-10" />
                <p className="text-gray-300 relative z-10">{s.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display font-bold text-3xl text-white mt-20 mb-8">Features of the MuscleBoxPro Protein Vending Machine</h2>
          <div className="grid sm:grid-cols-2 gap-4 not-prose my-8">
            {[
                { icon: Zap, text: "Automated protein blending in under 45 seconds" },
                { icon: IndianRupee, text: "Smart payment integration (UPI, Credit/Debit cards)" },
                { icon: Shield, text: "Self-cleaning system with hygienic ingredient containers" },
                { icon: CheckCircle2, text: "Customizable shake menu (Whey, Vegan, Flavors)" },
                { icon: CheckCircle2, text: "HD Digital display for advertising and gym announcements" },
                { icon: CheckCircle2, text: "Real-time inventory tracking and remote management" },
                { icon: CheckCircle2, text: "Compact footprint (less than 10 sq ft)" },
                { icon: CheckCircle2, text: "Temperature controlled to serve perfectly chilled shakes" }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4 bg-card/40 border border-white/10 p-5 rounded-xl hover:border-primary/50 transition-colors group">
                <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <f.icon className="text-primary h-6 w-6 flex-shrink-0" />
                </div>
                <span className="text-white font-medium">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-primary/20 via-black to-black border border-primary/30 p-8 md:p-10 rounded-3xl my-16 not-prose relative overflow-hidden shadow-2xl shadow-primary/10">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <IndianRupee className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <h2 className="font-display font-bold text-3xl text-white mb-4">Protein Vending Machine Revenue for Gyms</h2>
              <p className="text-gray-300 text-lg leading-relaxed max-w-2xl">
                The cost of shake preparation is significantly lower than the selling price, creating high profit margins. A gym protein shake machine generates passive income for gyms with minimal staff involvement.
              </p>
            </div>
          </div>

          <h2 className="font-display font-bold text-3xl text-white mt-16">
            {isIndiaPage
              ? "Protein Vending Machines for Gyms Across India"
              : `Protein Vending Machine Services in ${locationLabel}`}
          </h2>
          <p className="text-gray-400">
            {isIndiaPage
              ? "We provide installation, maintenance, and supplement restocking for protein shake vending machines in major Indian cities. If you are looking for a reliable protein vending machine India partner, we support full rollout and operations, including:"
              : `We provide installation, maintenance, and supplement restocking for protein shake vending machines for gyms in ${locationLabel}. We also support rollout in major Indian cities, including:`}
          </p>
          <div className="flex flex-wrap gap-3 my-6 not-prose">
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
                className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-bold hover:bg-primary/20 transition-colors"
              >
                <MapPin className="h-4 w-4" /> {name}
              </Link>
            ))}
          </div>

          <h2 className="font-display font-bold text-3xl text-white mt-20 mb-8">Protein Vending Machine FAQ</h2>
          <div className="space-y-4 my-8 not-prose" itemScope itemType="https://schema.org/FAQPage">
            {[
              { q: "What is a protein vending machine?", a: "A protein vending machine is an automated kiosk that instantly mixes and dispenses fresh protein shakes, pre-workouts, and BCAAs using high-quality powder and chilled water or milk." },
              { q: "How long does it take to prepare a shake?", a: "Our advanced gym protein shake machines prepare a perfectly blended, clump-free shake in under 45 seconds." },
              { q: "Why install a protein vending machine in a gym?", a: "It provides convenient 24/7 post-workout nutrition for members, requires zero staff overhead, and creates a high-margin passive revenue stream for gym owners." },
              { q: "Are the shakes made from powder or ready-to-drink bottles?", a: "The machine automatically mixes premium whey or plant-based protein powder with chilled water or milk on demand, ensuring a fresher and more customizable drink than pre-packaged bottles." },
              { q: "How do members pay for the protein shakes?", a: "Our machines support multiple cashless payment options including UPI, credit/debit cards, and an integrated digital wallet through the MuscleBoxPro app." }
            ].map((faq, i) => (
              <div key={i} className="bg-card/30 border border-white/10 p-6 rounded-xl hover:bg-card/50 transition-colors" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                <h3 className="text-white font-bold text-lg mb-2" itemProp="name">{faq.q}</h3>
                <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                  <p className="text-gray-400 m-0" itemProp="text">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-background mb-6">
            Install a Protein Vending Machine{isIndiaPage ? " in Your Gym" : ` in Your ${locationLabel} Gym`}
          </h2>
          <p className="text-background/80 text-xl mb-10 max-w-2xl mx-auto">
            If you are a gym owner looking to offer fresh protein shakes to your members, MuscleBoxPro provides a complete automated protein vending solution designed for modern fitness centers.
          </p>
          <Link href="/gym-demo">
            <Button size="lg" className="bg-background text-primary font-bold h-14 px-10 text-lg hover:bg-background/90 shadow-2xl">
              CONTACT US
            </Button>
          </Link>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}