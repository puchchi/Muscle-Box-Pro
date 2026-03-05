import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";

export default function TermsAndConditions() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content:
        "MuscleBoxPro is a smart vending platform operated by BlendBox Innovations LLP, providing freshly prepared protein shakes and nutritional beverages through automated vending machines and the website www.muscleboxpro.com."
    },
    {
      title: "2. User Agreement",
      content:
        "By accessing the website, using a vending machine, or making a purchase, users agree to comply with these Terms and Conditions."
    },
    {
      title: "3. Account and Information Accuracy",
      content:
        "Users must provide accurate information when creating an account or placing an order on the platform."
    },
    {
      title: "4. Product Preparation",
      content:
        "Protein shakes are prepared instantly through automated vending machines using selected ingredients such as protein powders, milk or water bases, flavors, and add-ons."
    },
    {
      title: "5. Allergies and Ingredient Responsibility",
      content:
        "Users are responsible for checking ingredient information and ensuring they do not have allergies to ingredients such as milk, nuts, seeds, or other additives."
    },
    {
      title: "6. Payments",
      content:
        "Payments may be made using digital payment methods including UPI, PhonePe, debit cards, credit cards, or other supported payment options."
    },
    {
      title: "7. Payment Security",
      content:
        "All payments are processed through secure third-party payment gateways and MuscleBoxPro does not store card or UPI credentials."
    },
    {
      title: "8. Service Availability",
      content:
        "Service availability may vary depending on machine location, connectivity, ingredient availability, or maintenance requirements."
    },
    {
      title: "9. Unauthorized Use",
      content:
        "Unauthorized use of the website, vending machines, or platform services may lead to suspension of access and legal action under applicable laws."
    },
    {
      title: "10. Intellectual Property",
      content:
        "All content on the platform including logos, graphics, software interfaces, and design elements are the intellectual property of BlendBox Innovations LLP."
    },
    {
      title: "11. Changes to Terms",
      content:
        "MuscleBoxPro reserves the right to modify services, pricing, or these Terms and Conditions at any time."
    },
    {
      title: "12. Governing Law and Jurisdiction",
      content:
        "These Terms shall be governed by the laws of India and any disputes shall fall under the jurisdiction of courts."
    },
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-8 text-primary">
            TERMS & <span className="text-white">CONDITIONS</span>
          </h1>
          <p className="text-gray-400 mb-12 italic">Last Updated: February 26, 2026</p>

          <div className="space-y-12">
            {sections.map((section, index) => (
              <section key={index} className="border-l-2 border-primary/30 pl-6">
                <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">
                  {section.title}
                </h2>
                <p className="text-gray-400 leading-relaxed">
                  {section.content}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-20 p-8 bg-secondary rounded-2xl border border-white/10">
            <h3 className="text-lg font-bold mb-4">Questions about our terms?</h3>
            <p className="text-gray-400 mb-6">
              If you have any questions regarding these terms, please contact our legal department at <span className="text-primary">contact@muscleboxpro.com</span>.
            </p>
            <a 
              href="mailto:contact@muscleboxpro.com" 
              className="inline-block bg-primary text-background font-bold py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors"
            >
              CONTACT US
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
