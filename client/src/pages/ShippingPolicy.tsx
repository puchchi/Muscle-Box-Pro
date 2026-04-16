"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";

const sections = [
  {
    title: "1. Shipping Coverage",
    content: "MuscleBoxPro, operated by BlendBox Innovations LLP, currently ships within India only. We do not offer international shipping at this time.",
  },
  {
    title: "2. Processing Time",
    content: "Orders are processed within 1–2 business days of payment confirmation. Orders placed on weekends or public holidays will be processed on the next business day.",
  },
  {
    title: "3. Delivery Timelines",
    content: "Standard delivery takes 4–7 business days depending on your location. Metro cities (Delhi, Mumbai, Bangalore, Hyderabad, Pune, Chennai) typically receive orders within 3–5 business days. Remote or non-serviceable areas may take longer.",
  },
  {
    title: "4. Shipping Charges",
    content: "Shipping is free on orders above ₹999. For orders below ₹999, a flat shipping fee of ₹79 applies. Charges are calculated and displayed at checkout before payment.",
  },
  {
    title: "5. Order Tracking",
    content: "Once your order is dispatched, you will receive a tracking number via email and SMS. You can use this to track your shipment on the courier partner's website.",
  },
  {
    title: "6. Damaged or Incorrect Orders",
    content: "If your order arrives damaged, tampered with, or incorrect, please contact us within 48 hours of delivery at contact@muscleboxpro.com with your order number and photos. We will arrange a replacement or refund as applicable.",
  },
  {
    title: "7. Undelivered or Returned Shipments",
    content: "If a shipment is returned to us due to an incorrect address or failed delivery attempts, we will contact you to reship. Additional shipping charges may apply for re-dispatch.",
  },
  {
    title: "8. Policy Updates",
    content: "MuscleBoxPro may update this Shipping Policy from time to time. Any changes will be published on this page with an updated effective date.",
  },
];

const faqs = [
  {
    q: "How long does delivery take?",
    a: "Standard delivery takes 4–7 business days. Metro cities typically receive orders in 3–5 business days. You will receive a tracking number once your order is dispatched.",
  },
  {
    q: "Is shipping free?",
    a: "Yes, shipping is free on orders above ₹999. A flat fee of ₹79 applies to orders below ₹999.",
  },
  {
    q: "Do you ship outside India?",
    a: "No. We currently ship within India only. International shipping is not available at this time.",
  },
  {
    q: "What should I do if my order arrives damaged?",
    a: "Contact us within 48 hours of delivery at contact@muscleboxpro.com with your order number and photos of the damaged item. We will arrange a replacement or refund.",
  },
  {
    q: "Can I change my delivery address after placing an order?",
    a: "Address changes can be requested within 12 hours of placing the order by contacting us at contact@muscleboxpro.com or +91-8687247670. Once the order is dispatched, the address cannot be changed.",
  },
];

export default function ShippingPolicy() {
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
              Shipping{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Policy
              </span>
            </h1>
            <p className="text-white/40 text-sm italic">Last Updated: April 16, 2026</p>
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
            <h3 className="font-bold text-gray-900 mb-2">Questions About Your Order?</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              For any questions about shipping or your delivery, contact our team at{" "}
              <a href="mailto:contact@muscleboxpro.com" className="text-primary hover:underline font-medium">
                contact@muscleboxpro.com
              </a>{" "}
              or call{" "}
              <a href="tel:+918687247670" className="text-primary hover:underline font-medium">
                +91-8687247670
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
