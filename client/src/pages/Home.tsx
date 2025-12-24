import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
      </main>
      <footer className="bg-black py-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm font-mono">
          © 2024 MUSCLE BOX PRO. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  );
}
