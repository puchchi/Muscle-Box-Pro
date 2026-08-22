import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-50 py-16 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-12">
          <div className="col-span-2">
            <span className="flex items-center gap-2 mb-6">
              <img
                src="/assets/logo_mini.png"
                alt="MuscleBoxPro"
                className="h-8 w-auto flex-shrink-0"
              />
              <span className="font-display text-lg font-bold tracking-wider text-brand-gradient">
                MUSCLEBOXPRO
              </span>
            </span>
            <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
              The ultimate on-demand nutrition solution for modern fitness centers.
              Premium shakes, zero maintenance, maximum impact.
            </p>
          </div>
          <div>
            <h4 className="text-gray-900 font-bold mb-6 text-sm uppercase tracking-widest">Locations</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <Link href="/protein-vending-machine-india"><li className="hover:text-primary cursor-pointer transition-colors block">India</li></Link>
              <Link href="/protein-vending-machine-delhi"><li className="hover:text-primary cursor-pointer transition-colors block">Delhi</li></Link>
              <Link href="/protein-vending-machine-mumbai"><li className="hover:text-primary cursor-pointer transition-colors block">Mumbai</li></Link>
              <Link href="/protein-vending-machine-bangalore"><li className="hover:text-primary cursor-pointer transition-colors block">Bangalore</li></Link>
              <Link href="/protein-vending-machine-hyderabad"><li className="hover:text-primary cursor-pointer transition-colors block">Hyderabad</li></Link>
              <Link href="/protein-vending-machine-pune"><li className="hover:text-primary cursor-pointer transition-colors block">Pune</li></Link>
              <Link href="/protein-vending-machine-chennai"><li className="hover:text-primary cursor-pointer transition-colors block">Chennai</li></Link>
              <Link href="/protein-vending-machine-ahmedabad"><li className="hover:text-primary cursor-pointer transition-colors block">Ahmedabad</li></Link>
              <Link href="/protein-vending-machine-kolkata"><li className="hover:text-primary cursor-pointer transition-colors block">Kolkata</li></Link>
              <Link href="/protein-vending-machine-chandigarh"><li className="hover:text-primary cursor-pointer transition-colors block">Chandigarh</li></Link>
              <Link href="/protein-vending-machine-gurgaon"><li className="hover:text-primary cursor-pointer transition-colors block">Gurgaon</li></Link>
              <Link href="/protein-vending-machine-noida"><li className="hover:text-primary cursor-pointer transition-colors block">Noida</li></Link>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-900 font-bold mb-6 text-sm uppercase tracking-widest">Company</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <Link href="/about"><li className="hover:text-primary cursor-pointer transition-colors block">About Us</li></Link>
              <Link href="/invest"><li className="hover:text-primary cursor-pointer transition-colors block">Invest in Us</li></Link>
              <Link href="/specs"><li className="hover:text-primary cursor-pointer transition-colors block">Our Machine</li></Link>
              <Link href="/gym-partnership"><li className="hover:text-primary cursor-pointer transition-colors block">Gym Partnership Terms</li></Link>
              <Link href="/protein-shake-vending-machine"><li className="hover:text-primary cursor-pointer transition-colors block">Vending Machine Business</li></Link>
              <Link href="/gym-protein-shake-machine"><li className="hover:text-primary cursor-pointer transition-colors block">Gym Shake Machine</li></Link>
              <Link href="/protein-vending-machine-india"><li className="hover:text-primary cursor-pointer transition-colors block">Vending Machine in India</li></Link>
              <Link href="/blog"><li className="hover:text-primary cursor-pointer transition-colors block">Blog</li></Link>
              <Link href="/blog/why-gyms-need-vending-machines"><li className="hover:text-primary cursor-pointer transition-colors block">Why Gyms Need This</li></Link>
              <Link href="/blog/best-protein-shake-after-workout"><li className="hover:text-primary cursor-pointer transition-colors block">Best Post-Workout Shake</li></Link>
              <Link href="/blog/protein-for-diabetes"><li className="hover:text-primary cursor-pointer transition-colors block">Protein & Diabetes</li></Link>
              <Link href="/blog/how-i-fixed-my-hba1c"><li className="hover:text-primary cursor-pointer transition-colors block">How I Fixed My HbA1C</li></Link>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-900 font-bold mb-6 text-sm uppercase tracking-widest">Support</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <Link href="/help"><li className="hover:text-primary cursor-pointer transition-colors block">Help Center</li></Link>
              <Link href="/contact"><li className="hover:text-primary cursor-pointer transition-colors block">Contact Us</li></Link>
              <Link href="/terms"><li className="hover:text-primary cursor-pointer transition-colors block">Terms & Conditions</li></Link>
              <Link href="/privacy"><li className="hover:text-primary cursor-pointer transition-colors block">Privacy Policy</li></Link>
              <Link href="/refund-cancellation"><li className="hover:text-primary cursor-pointer transition-colors block">Refund & Cancellation</li></Link>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em]">
            © 2026 MUSCLE BOX PRO. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
}
