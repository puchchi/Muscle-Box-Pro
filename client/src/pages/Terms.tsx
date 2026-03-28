"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/footer/index";
import { motion } from "framer-motion";

const sections = [
  { title: "1. Acceptance of Terms", content: "MuscleBoxPro is a smart vending platform operated by BlendBox Innovations LLP, providing freshly prepared protein shakes and nutritional beverages through automated vending machines and the website www.muscleboxpro.com." },
  { title: "2. User Agreement", content: "By accessing the website, using a vending machine, or making a purchase, users agree to comply with these Terms and Conditions." },
  { title: "3. Account and Information Accuracy", content: "Users must provide accurate information when creating an account or placing an order on the platform." },
  { title: "4. Product Preparation", content: "Protein shakes are prepared instantly through automated vending machines using selected ingredients such as protein powders, milk or water bases, flavors, and add-ons." },
  { title: "5. Allergies and Ingredient Responsibility", content: "Users are responsible for checking ingredient information and ensuring they do not have allergies to ingredients such as milk, nuts, seeds, or other additives." },
  { title: "6. Payments", content: "Payments may be made using digital payment methods including UPI, PhonePe, debit cards, credit cards, or other supported payment options." },
  { title: "7. Payment Security", content: "All payments are processed through secure third-party payment gateways and MuscleBoxPro does not store card or UPI credentials." },
  { title: "8. Service Availability", content: "Service availability may vary depending on machine location, connectivity, ingredient availability, or maintenance requirements." },
  { title: "9. Unauthorized Use", content: "Unauthorized use of the website, vending machines, or platform services may lead to suspension of access and legal action under applicable laws." },
  { title: "10. Intellectual Property", content: "All content on the platform including logos, graphics, software interfaces, and design elements are the intellectual property of BlendBox Innovations LLP." },
  { title: "11. Changes to Terms", content: "MuscleBoxPro reserves the right to modify services, pricing, or these Terms and Conditions at any time." },
  { title: "12. Governing Law and Jurisdiction", content: "These Terms shall be governed by the laws of India and any disputes shall fall under the jurisdiction of courts." },
];

const faqs = [
  { q: "What is MuscleBoxPro?", a: "MuscleBoxPro is a smart vending platform operated by BlendBox Innovations LLP that provides freshly prepared protein shakes and nutritional beverages through automated vending machines and the website www.muscleboxpro.com." },
  { q: "How do I pay at a MuscleBoxPro vending machine?", a: "You can pay using UPI, PhonePe, debit cards, credit cards, or other supported digital payment options. All transactions are processed through secure third-party payment gateways." },
  { q: "What if a machine is unavailable or out of ingredients?", a: "Service availability may vary depending on machine location, connectivity, ingredient availability, or maintenance requirements. Please contact our support team for assistance." },
  { q: "Who owns the content on the MuscleBoxPro platform?", a: "All content including logos, graphics, software interfaces, and design elements are the intellectual property of BlendBox Innovations LLP." },
  { q: "Can MuscleBoxPro change its terms and pricing?", a: "Yes. MuscleBoxPro reserves the right to modify services, pricing, or Terms and Conditions at any time. Changes are published on the website." },
];

export default function TermsAndConditions() {
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
              Terms &{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Conditions
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
            <h3 className="font-bold text-gray-900 mb-2">Questions about our terms?</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              If you have any questions regarding these terms, please contact our legal department at{" "}
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
