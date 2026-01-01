import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 uppercase tracking-tighter">
              CONTACT <span className="text-primary">US</span>
            </h1>
            <p className="text-gray-400 text-xl leading-relaxed">
              Have questions? Our team is here to help you fuel your fitness journey.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="bg-card border border-white/10 p-6 rounded-2xl flex items-start gap-4">
                <Mail className="text-primary h-6 w-6 mt-1" />
                <div>
                  <h3 className="text-white font-bold mb-1 uppercase tracking-wider">Email Us</h3>
                  <p className="text-gray-400">support@muscleboxpro.com</p>
                </div>
              </div>
              <div className="bg-card border border-white/10 p-6 rounded-2xl flex items-start gap-4">
                <Phone className="text-primary h-6 w-6 mt-1" />
                <div>
                  <h3 className="text-white font-bold mb-1 uppercase tracking-wider">Call Us</h3>
                  <p className="text-gray-400">+91 98765 43210</p>
                </div>
              </div>
              <div className="bg-card border border-white/10 p-6 rounded-2xl flex items-start gap-4">
                <MapPin className="text-primary h-6 w-6 mt-1" />
                <div>
                  <h3 className="text-white font-bold mb-1 uppercase tracking-wider">Visit Us</h3>
                  <p className="text-gray-400">Fitness Innovation Hub, Sector 62, Noida, India</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-white/10 p-8 rounded-3xl shadow-2xl">
              <h2 className="text-2xl font-display font-bold text-white mb-6 uppercase">Send a Message</h2>
              <form className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-mono">Name</label>
                  <Input className="bg-background border-white/10 focus:border-primary" placeholder="Your Name" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-mono">Email</label>
                  <Input className="bg-background border-white/10 focus:border-primary" placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-mono">Message</label>
                  <Textarea className="bg-background border-white/10 focus:border-primary min-h-[120px]" placeholder="How can we help?" />
                </div>
                <Button className="w-full bg-primary text-background font-bold h-12">SEND MESSAGE</Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
