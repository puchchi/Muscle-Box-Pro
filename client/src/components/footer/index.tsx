"use client";
import Link from "next/link";
import { Dumbbell } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black py-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2">
            <span className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-primary rounded-lg">
                <Dumbbell className="h-5 w-5 text-background" />
              </div>
              <span className="font-display text-lg tracking-wider text-white">
                MUSCLE BOX<span className="text-primary">PRO</span>
              </span>
            </span>
            <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
              The ultimate on-demand nutrition solution for modern fitness centers. 
              Premium shakes, zero maintenance, maximum impact.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Company</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <Link href="/about"><li className="hover:text-primary cursor-pointer transition-colors block">About Us</li></Link>
              <Link href="/specs"><li className="hover:text-primary cursor-pointer transition-colors block">Our Machine</li></Link>
              <Link href="/protein-shake-vending-machine"><li className="hover:text-primary cursor-pointer transition-colors block">Vending Machine Business</li></Link>
              <Link href="/gym-protein-shake-machine"><li className="hover:text-primary cursor-pointer transition-colors block">Gym Shake Machine</li></Link>
              <Link href="/protein-vending-machine-india"><li className="hover:text-primary cursor-pointer transition-colors block">Vending Machine in India</li></Link>
              <Link href="/blog/why-gyms-need-vending-machines"><li className="hover:text-primary cursor-pointer transition-colors block">Blog: Why Gyms Need This</li></Link>
              <Link href="/blog/best-protein-shake-after-workout"><li className="hover:text-primary cursor-pointer transition-colors block">Best Post-Workout Shake</li></Link>
              {/* <li className="hover:text-primary cursor-pointer transition-colors">Success Stories</li> */}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Support</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <Link href="/help"><li className="hover:text-primary cursor-pointer transition-colors block">Help Center</li></Link>
              <Link href="/contact"><li className="hover:text-primary cursor-pointer transition-colors block">Contact Us</li></Link>
              <Link href="/terms"><li className="hover:text-primary cursor-pointer transition-colors block">Terms & Conditions</li></Link>
              <Link href="/privacy"><li className="hover:text-primary cursor-pointer transition-colors block">Privacy Policy</li></Link>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.2em]">
            © 2026 MUSCLE BOX PRO. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
}
