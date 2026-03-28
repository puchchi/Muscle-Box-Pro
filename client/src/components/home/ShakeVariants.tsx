"use client";

import { motion } from "framer-motion";
import { Button } from "../ui/button";
import Link from "next/link";

const shakeVariants = [
  {
    id: 1,
    name: "Pure Whey",
    category: "Classic",
    ingredients: ["Protein Isolate", "Water"],
    protein: 30,
    carbs: 2,
    fat: 1,
    calories: 130,
    price: 120,
    color: "from-blue-500 to-cyan-500",
    image: "/images/pure_vanilla_protein_shake_in_glass.png",
  },
  {
    id: 2,
    name: "Banana Blend",
    category: "Popular",
    ingredients: ["Protein Isolate", "Fresh Banana", "Water"],
    protein: 28,
    carbs: 35,
    fat: 1,
    calories: 270,
    price: 150,
    color: "from-yellow-500 to-orange-500",
    badge: "BESTSELLER",
    image: "/images/fresh_tropical_banana_shake.png",
  },
  {
    id: 3,
    name: "Date Delight",
    category: "Premium",
    ingredients: ["Protein Isolate", "Fresh Banana", "Medjool Dates", "Water"],
    protein: 28,
    carbs: 48,
    fat: 2,
    calories: 360,
    price: 160,
    color: "from-amber-600 to-red-600",
    badge: "PREMIUM",
    image: "/images/premium_date_banana_shake.png",
  },
  {
    id: 4,
    name: "Chocolate Pure",
    category: "Flavor",
    ingredients: ["Chocolate Whey", "Water"],
    protein: 30,
    carbs: 3,
    fat: 1,
    calories: 140,
    price: 130,
    color: "from-amber-900 to-orange-700",
    image: "/images/premium_dark_chocolate_shake.png",
  },
  {
    id: 5,
    name: "Chocolate Banana",
    category: "Flavor",
    ingredients: ["Chocolate Whey", "Fresh Banana", "Water"],
    protein: 28,
    carbs: 36,
    fat: 1,
    calories: 280,
    price: 160,
    color: "from-amber-800 to-amber-600",
    image: "/images/chocolate_banana_protein_shake.png",
  },
  {
    id: 6,
    name: "Chocolate Date",
    category: "Flavor",
    ingredients: ["Chocolate Whey", "Fresh Banana", "Medjool Dates", "Water"],
    protein: 28,
    carbs: 50,
    fat: 2,
    calories: 370,
    price: 170,
    color: "from-amber-900 to-orange-900",
    image: "/images/chocolate_banana_date_protien_shake.png",
  },
  {
    id: 7,
    name: "Creamy Whey",
    category: "Milk-Based",
    ingredients: ["Protein Isolate", "Whole Milk"],
    protein: 30,
    carbs: 11,
    fat: 8,
    calories: 240,
    price: 130,
    color: "from-purple-400 to-pink-400",
    image: "/images/creamy_protien_shake.png",
  },
  {
    id: 8,
    name: "Creamy Banana",
    category: "Milk-Based",
    ingredients: ["Protein Isolate", "Fresh Banana", "Whole Milk"],
    protein: 28,
    carbs: 44,
    fat: 8,
    calories: 380,
    price: 160,
    color: "from-purple-500 to-pink-500",
    image: "/images/creamy_banana_proties_shake.png",
  },
  {
    id: 9,
    name: "Creamy Date",
    category: "Milk-Based",
    ingredients: ["Protein Isolate", "Fresh Banana", "Medjool Dates", "Whole Milk"],
    protein: 28,
    carbs: 57,
    fat: 8,
    calories: 470,
    price: 170,
    color: "from-purple-600 to-pink-600",
    image: "/images/creamy_banana_date_protien_shake.png",
  },
  {
    id: 10,
    name: "Chocolate Creamy",
    category: "Milk-Based",
    ingredients: ["Chocolate Whey", "Whole Milk"],
    protein: 30,
    carbs: 12,
    fat: 8,
    calories: 250,
    price: 140,
    color: "from-purple-900 to-pink-900",
    image: "/images/chocolate_milk_protein_shake.png",
  },
  {
    id: 11,
    name: "Chocolate Creamy Banana",
    category: "Milk-Based",
    ingredients: ["Chocolate Whey", "Fresh Banana", "Whole Milk"],
    protein: 28,
    carbs: 45,
    fat: 8,
    calories: 390,
    price: 150,
    color: "from-purple-950 to-pink-950",
    image: "/images/chocolate_banana_milk_protein_shake.png",
  },
  {
    id: 12,
    name: "Chocolate Creamy Date",
    category: "Milk-Based",
    ingredients: ["Chocolate Whey", "Fresh Banana", "Medjool Dates", "Whole Milk"],
    protein: 28,
    carbs: 58,
    fat: 8,
    calories: 480,
    price: 160,
    color: "from-red-900 to-orange-900",
    image: "/images/chocolate_banana_date_milk_protein_shake.png",
  },
];

export default function ShakeVariants({ limit }: { limit?: number }) {
  const displayedShakes = limit ? shakeVariants.slice(0, limit) : shakeVariants;

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase mb-3 block">
              Our menu
            </span>
            <h2
              className="font-display font-black text-foreground leading-none uppercase"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              {limit ? "Popular blends" : "All 12 blends"}
            </h2>
          </div>
          {!limit && (
            <p className="text-muted-foreground text-sm max-w-xs sm:text-right leading-relaxed">
              Fresh ingredients, premium whey isolate. Every blend made to order in 60 seconds.
            </p>
          )}
        </div>

        {/* Category filter — full menu only */}
        {!limit && (
          <div className="flex gap-2 flex-wrap mb-10">
            {["All", "Classic", "Popular", "Premium", "Flavor", "Milk-Based"].map((cat) => (
              <span
                key={cat}
                className="px-4 py-2 rounded-full border border-gray-200 text-xs font-semibold text-gray-500 hover:border-primary/40 hover:text-primary transition-all cursor-pointer"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Shake grid — Airbnb listing card style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedShakes.map((shake, i) => (
            <motion.div
              key={shake.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default border border-gray-100"
            >
              {/* Product image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                  src={shake.image}
                  alt={shake.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Badge — white pill top-left (Airbnb "Superhost" style) */}
                {shake.badge && (
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1.5 rounded-full bg-white text-[11px] font-bold text-gray-900 tracking-wide shadow-sm">
                      {shake.badge}
                    </span>
                  </div>
                )}

              </div>

              {/* Card info */}
              <div className="p-4 pb-5">
                {/* Name + protein */}
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900 text-[15px] leading-snug">
                    {shake.name}
                  </h3>
                  <span className="text-[13px] font-semibold text-gray-700 ml-2 flex-shrink-0">
                    <span className="text-primary">★</span> {shake.protein}g
                  </span>
                </div>

                {/* Category + count */}
                <p className="text-gray-400 text-[13px] mb-3">
                  {shake.category} · {shake.ingredients.length} ingredient{shake.ingredients.length > 1 ? "s" : ""}
                </p>

                {/* Macros */}
                <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-4">
                  <span>{shake.carbs}g carbs</span>
                  <span>·</span>
                  <span>{shake.fat}g fat</span>
                  <span>·</span>
                  <span>{shake.calories} kcal</span>
                </div>

                {/* Price */}
                <span className="text-gray-900 font-semibold text-[15px]">
                  ₹{shake.price}
                  <span className="text-gray-400 font-normal text-[13px]"> / serving</span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View all CTA */}
        {limit && (
          <div className="mt-12 text-center">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 px-8 rounded-full font-semibold border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer text-base"
            >
              <Link href="/menu">View all 12 blends →</Link>
            </Button>
          </div>
        )}

        {/* Full menu: custom blend note */}
        {!limit && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 p-8 rounded-2xl border border-gray-200 bg-gray-50 text-center"
          >
            <h3 className="font-display font-black text-2xl text-foreground uppercase mb-2">
              Custom blends available
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
              Want a combination not listed? Our machines support unlimited customization.
              Ask your gym staff about custom blend options.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
