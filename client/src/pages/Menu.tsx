"use client";
import Navbar from "@/components/layout/Navbar";
import ShakeVariants from "@/components/home/ShakeVariants";
import Footer from "@/components/footer/index";

export default function Menu() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-gradient-to-r from-accent/25 to-primary/25 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 hero-rise">
          <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
            Our Menu
          </span>
          <h1
            className="font-display font-black text-white uppercase leading-none mb-5 text-balance"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.8rem)" }}
          >
            All{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              12 blends.
            </span>
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-md mx-auto">
            Fresh ingredients, premium whey isolate. Every blend made to order in 60 seconds.
          </p>
        </div>
      </section>

      <main>
        <ShakeVariants />
      </main>

      <Footer />
    </div>
  );
}
