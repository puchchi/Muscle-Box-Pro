import { Zap, Leaf, Smartphone, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import shakeImg from "@assets/generated_images/fresh_banana_date_protein_shake_advertising_shot..png";

const features = [
  {
    icon: Zap,
    title: "Instant Recovery",
    desc: "30 seconds from touch to shake. No clumps, perfectly blended every time.",
  },
  {
    icon: Leaf,
    title: "Real Ingredients",
    desc: "Fresh bananas, medjool dates, and premium whey isolate. No artificial junk.",
  },
  {
    icon: Smartphone,
    title: "Smart Profile",
    desc: "Track macros, save favorites, and pay with a tap using our app.",
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
             <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
              PREMIUM NUTRITION <br />
              <span className="text-primary">ZERO COMPROMISE</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Forget warm shakers and lumpy powder. Muscle Box Pro delivers barista-quality protein shakes right where you need them. We partner with top local suppliers to ensure fresh fruit is restocked daily.
            </p>

            <div className="grid gap-6">
              {features.map((feature, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background transition-colors">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8 }}
             className="relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
            <img 
              src={shakeImg} 
              alt="Fresh Shake" 
              className="relative z-10 w-full rounded-2xl border border-white/10 shadow-2xl shadow-primary/20 hover:scale-105 transition-transform duration-500"
            />
            
            {/* Float Card */}
            <div className="absolute -bottom-10 -left-10 z-20 bg-card/90 backdrop-blur-md p-6 rounded-xl border border-primary/30 box-glow max-w-xs">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="text-primary w-5 h-5" />
                <span className="text-white font-bold">Macro Profile</span>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Protein</span>
                  <span className="text-white font-mono">30g</span>
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[80%]" />
                </div>
                <div className="flex justify-between">
                  <span>Carbs</span>
                  <span className="text-white font-mono">45g</span>
                </div>
                 <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                  <div className="bg-accent h-full w-[60%]" />
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
