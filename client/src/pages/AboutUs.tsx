import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Info, Target, Users } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 uppercase tracking-tighter">
              ABOUT <span className="text-primary">US</span>
            </h1>
            <p className="text-gray-400 text-xl leading-relaxed">
              We are on a mission to revolutionize fitness nutrition through smart automation and premium ingredients.
            </p>
          </motion.div>

          <div className="grid gap-12">
            <section className="bg-card border border-white/10 p-8 rounded-3xl">
              <div className="flex items-center gap-4 mb-4">
                <Target className="text-primary h-8 w-8" />
                <h2 className="text-2xl font-display font-bold text-white uppercase">Our Vision</h2>
              </div>
              <p className="text-gray-400 leading-relaxed">
                To become the global standard for on-demand fitness nutrition, providing gym members with fresh, perfectly macro-balanced shakes at the touch of a button. We believe that post-workout nutrition should be effortless, high-quality, and delicious.
              </p>
            </section>

            <section className="bg-card border border-white/10 p-8 rounded-3xl">
              <div className="flex items-center gap-4 mb-4">
                <Users className="text-primary h-8 w-8" />
                <h2 className="text-2xl font-display font-bold text-white uppercase">Our Team</h2>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Muscle Box Pro was founded by a team of fitness enthusiasts, engineers, and nutritionists who saw a gap in the market. We combined our expertise to create a machine that doesn't just vend, but crafts a premium experience for every user.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
