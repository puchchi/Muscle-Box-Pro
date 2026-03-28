"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";

const sections = [
  { title: "1. Privacy Commitment", content: "MuscleBoxPro, operated by BlendBox Innovations LLP, is committed to protecting user privacy and personal information." },
  { title: "2. Information We Collect", content: "The platform may collect limited personal information including Name, Email address, Mobile number, Payment transaction details, and Machine usage data." },
  { title: "3. When Information Is Collected", content: "Personal information is collected when users register on the platform, place an order, contact customer support, or interact with the website or vending machines." },
  { title: "4. Purpose of Data Usage", content: "Information collected is used to process orders and payments, provide customer support, improve vending machine operations and services, and communicate updates, promotions, or service notifications." },
  { title: "5. Payment Security", content: "Payments are processed through third-party payment providers such as PhonePe or other digital payment systems, and sensitive payment credentials are not stored by MuscleBoxPro." },
  { title: "6. Sharing of Data", content: "Personal data may be shared with trusted service providers only when necessary to process payments or operate services." },
  { title: "7. Data Protection Measures", content: "MuscleBoxPro implements reasonable technical and security measures to protect user data from unauthorized access or misuse." },
  { title: "8. User Rights", content: "Users may request access, correction, or deletion of their personal information by contacting customer support." },
  { title: "9. Data Retention", content: "Personal data will only be retained for as long as necessary for business operations or as required by applicable law." },
  { title: "10. Consent", content: "By using the platform, users consent to the collection and use of information in accordance with this Privacy Policy." },
  { title: "11. Policy Updates", content: "MuscleBoxPro may update this Privacy Policy periodically and changes will be published on the website." },
];

const faqs = [
  { q: "What personal information does MuscleBoxPro collect?", a: "MuscleBoxPro may collect your name, email address, mobile number, payment transaction details, and machine usage data when you register, place an order, or interact with the platform." },
  { q: "How is my payment information secured?", a: "Payments are processed through third-party providers such as PhonePe. MuscleBoxPro does not store your card or UPI credentials." },
  { q: "Can I request deletion of my personal data?", a: "Yes. You may request access, correction, or deletion of your personal information by contacting our team at contact@muscleboxpro.com or +91-8687247670." },
  { q: "Does MuscleBoxPro share my data with third parties?", a: "Personal data may be shared with trusted service providers only when necessary to process payments or operate services. It is never sold to third parties." },
  { q: "How long is my data retained?", a: "Personal data is retained only as long as necessary for business operations or as required by applicable law." },
];

export default function PrivacyPolicy() {
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
              Privacy{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Policy
              </span>
            </h1>
            <p className="text-white/40 text-sm italic">Last Updated: February 26, 2026</p>
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
            <h3 className="font-bold text-gray-900 mb-2">Privacy Concerns?</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              If you have any questions or concerns about our privacy practices, please contact our data protection team at{" "}
              <a href="mailto:contact@muscleboxpro.com" className="text-primary hover:underline font-medium">
                contact@muscleboxpro.com
              </a>{" "}
              or call us at{" "}
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
