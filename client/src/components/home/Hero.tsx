import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import heroBg from "@assets/generated_images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png";

export default function Hero() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/50 to-background z-10" />
        <img
          src={heroBg}
          alt="Muscle Box Pro Machine"
          className="w-full h-full object-cover opacity-60"
        />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-block mb-4 px-4 py-1 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm">
            <span className="text-primary font-mono text-sm tracking-widest uppercase">
              The Future of Fuel
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-9xl font-display font-bold text-white mb-6 tracking-tight text-glow">
            FUEL YOUR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              GAINS INSTANTLY
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-300 mb-10 font-light leading-relaxed">
            Fresh banana, premium whey, and organic dates blended on demand. 
            The first smart vending solution for serious athletes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/gym-demo">
              <Button size="lg" className="h-14 px-8 text-lg font-bold bg-primary text-background hover:bg-primary/90 rounded-none skew-x-[-10deg]">
                <span className="skew-x-[10deg]">REQUEST DEMO</span>
              </Button>
            </Link>
            <Link href="/account">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold border-primary text-primary hover:bg-primary/10 rounded-none skew-x-[-10deg]">
                <span className="skew-x-[10deg]">USER LOGIN</span>
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent z-20" />
    </div>
  );
}
