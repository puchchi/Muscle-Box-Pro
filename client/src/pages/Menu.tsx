"use client";
import Navbar from "@/components/layout/Navbar";
import ShakeVariants from "@/components/home/ShakeVariants";
import Footer from "@/components/footer/index";

export default function Menu() {
  return (
    <div className="min-h-screen bg-background">

      <Navbar />
      
      <main className="pt-20">
        <ShakeVariants />
      </main>

      <Footer />
    </div>
  );
}