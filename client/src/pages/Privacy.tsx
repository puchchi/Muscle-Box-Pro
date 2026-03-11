"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Privacy Commitment",
      content:
        "MuscleBoxPro, operated by BlendBox Innovations LLP, is committed to protecting user privacy and personal information."
    },
    {
      title: "2. Information We Collect",
      content:
        "The platform may collect limited personal information including Name, Email address, Mobile number, Payment transaction details, and Machine usage data."
    },
    {
      title: "3. When Information Is Collected",
      content:
        "Personal information is collected when users register on the platform, place an order, contact customer support, or interact with the website or vending machines."
    },
    {
      title: "4. Purpose of Data Usage",
      content:
        "Information collected is used to process orders and payments, provide customer support, improve vending machine operations and services, and communicate updates, promotions, or service notifications."
    },
    {
      title: "5. Payment Security",
      content:
        "Payments are processed through third-party payment providers such as PhonePe or other digital payment systems, and sensitive payment credentials are not stored by MuscleBoxPro."
    },
    {
      title: "6. Sharing of Data",
      content:
        "Personal data may be shared with trusted service providers only when necessary to process payments or operate services."
    },
    {
      title: "7. Data Protection Measures",
      content:
        "MuscleBoxPro implements reasonable technical and security measures to protect user data from unauthorized access or misuse."
    },
    {
      title: "8. User Rights",
      content:
        "Users may request access, correction, or deletion of their personal information by contacting customer support."
    },
    {
      title: "9. Data Retention",
      content:
        "Personal data will only be retained for as long as necessary for business operations or as required by applicable law."
    },
    {
      title: "10. Consent",
      content:
        "By using the platform, users consent to the collection and use of information in accordance with this Privacy Policy."
    },
    {
      title: "11. Policy Updates",
      content:
        "MuscleBoxPro may update this Privacy Policy periodically and changes will be published on the website."
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
            PRIVACY <span className="text-white">POLICY</span>
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
            <h3 className="text-lg font-bold mb-4">Privacy Concerns?</h3>
            <p className="text-gray-400 mb-6">
              If you have any questions or concerns about our privacy practices, please contact our data protection team.
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
