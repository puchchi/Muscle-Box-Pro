import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";

export default function TermsAndConditions() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing and using Muscle Box Pro vending machines and our digital platforms, you agree to be bound by these Terms and Conditions. If you do not agree, please refrain from using our services."
    },
    {
      title: "2. User Accounts & Wallet",
      content: "Users are responsible for maintaining the confidentiality of their account credentials. Credits added to the Muscle Box Pro wallet are non-refundable but can be used at any Muscle Box Pro location nationwide. We are not responsible for unauthorized access to your account due to negligence."
    },
    {
      title: "3. Product Consumption",
      content: "Our protein shakes are prepared using high-quality supplements. However, users are responsible for checking allergen information displayed on the machine and ensuring the product aligns with their dietary requirements and health conditions. Muscle Box Pro is not liable for adverse reactions resulting from undisclosed medical conditions or allergies."
    },
    {
      title: "4. Gym Owner Responsibilities",
      content: "Gym owners partnering with Muscle Box Pro must ensure the machine is provided with the required power supply and space as per the partnership agreement. Revenue sharing is calculated based on net sales and settled according to the agreed-upon billing cycle."
    },
    {
      title: "5. Intellectual Property",
      content: "All content, branding, and technology associated with Muscle Box Pro are the exclusive property of Muscle Box Pro. Unauthorized reproduction or use of our trademarked materials is strictly prohibited."
    },
    {
      title: "6. Limitation of Liability",
      content: "Muscle Box Pro shall not be liable for any indirect, incidental, or consequential damages arising from the use of our machines or digital services. Our total liability is limited to the amount paid by the user for the specific service or product in question."
    }
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
              If you have any questions regarding these terms, please contact our legal department.
            </p>
            <a 
              href="mailto:legal@muscleboxpro.com" 
              className="inline-block bg-primary text-background font-bold py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors"
            >
              CONTACT LEGAL
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
