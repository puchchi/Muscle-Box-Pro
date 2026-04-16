"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";

const sections = [
  {
    title: "1. Order Cancellation",
    content:
      "Orders placed through MuscleBoxPro vending machines are processed instantly and therefore cannot be cancelled once the preparation of the beverage has started.",
  },
  {
    title: "2. Eligible Refund Cases",
    content:
      "Refunds may be issued when payment is successfully deducted but the vending machine fails to dispense the product, when the beverage is only partially dispensed due to a machine malfunction, or when a technical error occurs during payment processing.",
  },
  {
    title: "3. Refund Request Window",
    content:
      "Users must report refund requests within 24 hours of the transaction through the customer support contact provided on the website.",
  },
  {
    title: "4. Verification Process",
    content:
      "Refund requests will be reviewed based on transaction records and machine logs.",
  },
  {
    title: "5. Refund Processing Timeline",
    content:
      "Approved refunds will be processed within 3–5 business days to the original payment method used during the transaction.",
  },
  {
    title: "6. Refund Decision Rights",
    content:
      "MuscleBoxPro reserves the right to decline refund requests where transaction records indicate successful dispensing of the product.",
  },
  {
    title: "7. No Returns Policy",
    content:
      "All sales are final. MuscleBoxPro does not accept returns of any products once dispensed or delivered. Given the perishable and consumable nature of our products, returns cannot be accepted under any circumstances. Refunds, where applicable, are governed exclusively by the conditions outlined in this policy.",
  },
];

const faqs = [
  {
    q: "Can I cancel my order after the shake has started blending?",
    a: "No. Orders are processed instantly and cannot be cancelled once beverage preparation has begun. The machine starts blending immediately after payment confirmation.",
  },
  {
    q: "What should I do if I paid but didn't receive my shake?",
    a: "Contact our support team at contact@muscleboxpro.com within 24 hours of the transaction with your transaction ID. We will review machine logs and process a refund if verified.",
  },
  {
    q: "How long does a refund take to reach my account?",
    a: "Approved refunds are processed within 3–5 business days and credited back to the original payment method (UPI, card, or wallet).",
  },
  {
    q: "What evidence is needed for a refund request?",
    a: "Provide your transaction ID, date and time of purchase, and the gym location. Our team will cross-check with machine dispensing logs to verify the claim.",
  },
];

export default function RefundCancellationPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-gray-950 pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[220px] bg-gradient-to-r from-accent/15 to-primary/15 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/15 text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-6">
              Legal
            </span>
            <h1
              className="font-display font-black text-white uppercase leading-none mb-4"
              style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)" }}
            >
              Refund &{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Cancellation
              </span>
            </h1>
            <p className="text-white/40 text-sm italic">Last Updated: March 03, 2026</p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Sections */}
          <div className="space-y-8 mb-16">
            {sections.map((section, i) => (
              <motion.section
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="border-l-2 border-primary/25 pl-6"
              >
                <h2 className="font-display font-black text-gray-900 uppercase text-base tracking-wide mb-2">
                  {section.title}
                </h2>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {section.content}
                </p>
              </motion.section>
            ))}
          </div>

          <div className="h-px bg-gray-100 mb-16" />

          {/* FAQ */}
          <div className="mb-16">
            <h2 className="font-display font-black text-gray-900 uppercase text-2xl mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3" itemScope itemType="https://schema.org/FAQPage">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:border-primary/20 transition-colors"
                  itemScope itemProp="mainEntity" itemType="https://schema.org/Question"
                >
                  <h3 className="font-bold text-gray-900 mb-2 text-sm" itemProp="name">{faq.q}</h3>
                  <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                    <p className="text-gray-600 text-sm leading-relaxed m-0" itemProp="text">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact box */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-7">
            <h3 className="font-bold text-gray-900 mb-2">Need refund support?</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              For refund or cancellation assistance, please contact our support team at{" "}
              <a href="mailto:contact@muscleboxpro.com" className="text-primary hover:underline font-medium">
                contact@muscleboxpro.com
              </a>.
            </p>
            <a
              href="/contact"
              className="inline-block bg-primary text-white font-bold py-2.5 px-6 rounded-xl hover:bg-primary/90 transition-colors text-sm cursor-pointer"
            >
              Contact Us
            </a>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
