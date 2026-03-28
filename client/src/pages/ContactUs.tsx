"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";
import { Mail, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ContactUs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      setIsSubmitting(true);
      const { data, error } = await supabase.functions.invoke(
        "contact-request",
        { body: { name, email, message } },
      );
      if (error) throw error;
      setNotice({
        type: "success",
        message:
          (data as { message?: string })?.message ||
          "Thanks for reaching out. We will contact you shortly.",
      });
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to submit your message right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
              Get in Touch
            </span>
            <h1
              className="font-display font-black text-white uppercase leading-none mb-4"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
            >
              Contact{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Us
              </span>
            </h1>
            <p className="text-white/50 text-base leading-relaxed">
              Have questions? Our team is here to help you fuel your fitness journey.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-5 gap-8 items-start">

            {/* ── Left: Info ── */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-2 space-y-4"
            >
              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Email Us</h3>
                  <a
                    href="mailto:contact@muscleboxpro.com"
                    className="text-gray-600 text-sm hover:text-primary transition-colors"
                  >
                    contact@muscleboxpro.com
                  </a>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Our Office</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Blendbox Innovations LLP<br />
                    Sector 75, Noida<br />
                    Uttar Pradesh, India
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-accent/10 to-primary/10 border border-primary/10 rounded-2xl p-6">
                <p className="font-bold text-gray-900 text-sm mb-1">Looking to install a machine?</p>
                <p className="text-gray-600 text-xs leading-relaxed mb-3">
                  Gym owners can request a free demo directly from our Gym Demo page.
                </p>
                <a
                  href="/gym-demo"
                  className="inline-flex items-center gap-1.5 text-primary text-xs font-bold hover:underline"
                >
                  Request a Demo <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>

            {/* ── Right: Form ── */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm"
            >
              <h2 className="font-display font-black text-foreground uppercase text-xl mb-6">
                Send a Message
              </h2>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {notice && (
                  <div className={
                    notice.type === "success"
                      ? "rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
                      : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  }>
                    {notice.message}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-gray-700 text-sm font-semibold">Name</label>
                  <Input
                    className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-700 text-sm font-semibold">Email</label>
                  <Input
                    type="email"
                    className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-700 text-sm font-semibold">Message</label>
                  <Textarea
                    className="bg-gray-50 border-gray-200 focus:border-primary focus:bg-white transition-colors rounded-xl min-h-[130px] resize-none"
                    placeholder="How can we help?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-primary text-white font-bold hover:bg-primary/90 transition-colors rounded-xl cursor-pointer shadow-md shadow-primary/20"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                  {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
                </Button>
              </form>
            </motion.div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
