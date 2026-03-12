"use client";
import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, MapPin, IndianRupee, Zap, Shield, Play } from "lucide-react";
import Footer from "@/components/footer";

export default function ProteinVendingMachineIndia() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-6">
              Protein <span className="text-primary">Vending Machine</span> for Gyms in India
            </h1>
            <p className="text-gray-400 text-xl leading-relaxed max-w-3xl mx-auto">
              Protein vending machines are becoming increasingly popular in gyms and fitness centers across India. These machines automatically prepare fresh protein shakes using premium whey protein and natural ingredients, allowing gym members to enjoy convenient post-workout nutrition.
            </p>
            <p className="text-gray-400 text-xl leading-relaxed max-w-3xl mx-auto mt-4">
              MuscleBoxPro provides a smart protein vending machine designed specifically for gyms. The system blends protein shakes instantly and dispenses them hygienically without requiring manual preparation. For gym owners, installing a protein vending machine creates an additional revenue stream while improving the overall gym experience.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/gym-demo">
                <Button size="lg" className="bg-primary text-background font-bold h-14 px-8 text-lg w-full sm:w-auto hover:bg-primary/90">
                  REQUEST MACHINE DEMO
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Image Section */}
      <section className="py-12 bg-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative aspect-[21/9] rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-primary/20 group">
             <img 
              src="/images/futuristic_protein_shake_vending_machine_in_a_modern_gym..png"
              alt="protein vending machine for gyms in India" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="py-24 bg-card/30 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-invert prose-lg">
          
          <h2 className="font-display font-bold text-3xl text-white">What is a Protein Vending Machine?</h2>
          <p className="text-gray-400">
            A protein vending machine automatically blends protein powder, fruits and liquids to create fresh protein shakes on demand. These machines are typically installed in gyms, fitness centers, universities and sports complexes.
          </p>
          <p className="text-gray-400">
            Unlike traditional vending machines that dispense packaged drinks, protein vending machines prepare fresh shakes using an automated blending system.
          </p>

          <h2 className="font-display font-bold text-3xl text-white mt-16">Why Gyms in India Are Installing Protein Vending Machines</h2>
          <p className="text-gray-400">Gym owners across India are upgrading their facilities with automated solutions to provide better service and increase profitability.</p>
          <ul className="space-y-4 my-8 text-gray-400 list-none pl-0">
            <li className="flex items-center gap-3"><CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" /><span>instant post-workout nutrition for members</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" /><span>hygienic shake preparation</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" /><span>automated dispensing</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" /><span>additional revenue stream</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="text-primary h-6 w-6 flex-shrink-0" /><span>convenient supplement access</span></li>
          </ul>

          <h2 className="font-display font-bold text-3xl text-white mt-16">How a Protein Vending Machine Works</h2>
          <div className="grid md:grid-cols-3 gap-6 my-8 not-prose">
            {[
              { step: "1", title: "Select", desc: "Member selects a protein shake from the machine interface" },
              { step: "2", title: "Blend", desc: "The machine automatically blends protein powder and ingredients" },
              { step: "3", title: "Dispense", desc: "A fresh protein shake is dispensed within seconds" }
            ].map((s) => (
              <div key={s.step} className="bg-background/50 border border-white/10 p-6 rounded-2xl relative overflow-hidden">
                <span className="absolute -top-4 -right-4 text-8xl font-display font-bold text-white/5">{s.step}</span>
                <Play className="text-primary h-8 w-8 mb-4 relative z-10" />
                <p className="text-gray-300 relative z-10">{s.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display font-bold text-3xl text-white mt-16">Features of the MuscleBoxPro Protein Vending Machine</h2>
          <ul className="space-y-4 my-8 text-gray-400 list-none pl-0">
            <li className="flex items-center gap-3"><Zap className="text-primary h-5 w-5 flex-shrink-0" /><span>automated protein blending</span></li>
            <li className="flex items-center gap-3"><IndianRupee className="text-primary h-5 w-5 flex-shrink-0" /><span>smart payment integration (UPI / cards)</span></li>
            <li className="flex items-center gap-3"><Shield className="text-primary h-5 w-5 flex-shrink-0" /><span>hygienic ingredient containers</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" /><span>customizable shake menu</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" /><span>digital display for advertising</span></li>
          </ul>

          <h2 className="font-display font-bold text-3xl text-white mt-16">Protein Vending Machine Revenue for Gyms</h2>
          <p className="text-gray-400">
            The cost of shake preparation is significantly lower than the selling price, creating high profit margins. A gym protein shake machine generates passive income for gyms with minimal staff involvement.
          </p>

          <h2 className="font-display font-bold text-3xl text-white mt-16">Protein Vending Machines for Gyms Across India</h2>
          <p className="text-gray-400">We provide installation, maintenance, and supplement restocking for protein shake vending machines in major Indian cities, including:</p>
          <div className="flex flex-wrap gap-3 my-6 not-prose">
            {["Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Pune", "Chennai"].map(city => (
              <span key={city} className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-bold">
                <MapPin className="h-4 w-4" /> {city}
              </span>
            ))}
          </div>

          <h2 className="font-display font-bold text-3xl text-white mt-16">Protein Vending Machine FAQ</h2>
          <div className="space-y-6 my-8" itemScope itemType="https://schema.org/FAQPage">
            <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <strong className="text-white block mb-2" itemProp="name">What is a protein vending machine?</strong>
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                <p className="text-gray-400 m-0" itemProp="text">A protein vending machine automatically prepares fresh protein shakes using protein powder and other ingredients.</p>
              </div>
            </div>
            <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <strong className="text-white block mb-2" itemProp="name">How long does it take to prepare a shake?</strong>
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                <p className="text-gray-400 m-0" itemProp="text">Most machines prepare a shake in about 20–30 seconds.</p>
              </div>
            </div>
            <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <strong className="text-white block mb-2" itemProp="name">Why install a protein vending machine in a gym?</strong>
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                <p className="text-gray-400 m-0" itemProp="text">It provides convenient nutrition for members and creates additional revenue for gym owners.</p>
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-background mb-6">
            Install a Protein Vending Machine in Your Gym
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
      
      {/* Simple Footer for SEO Page */}
      <Footer />
    </div>
  );
}