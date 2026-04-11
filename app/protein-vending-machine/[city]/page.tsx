import type { Metadata } from "next";
import ProteinVendingMachineIndia, { type CityData } from "@/pages/ProtienVendingMachineIndia";

type CityConfig = CityData & { name: string };

const cityConfig: Record<string, CityConfig> = {
  delhi: {
    name: "Delhi",
    neighborhoods: ["South Delhi", "Dwarka", "Saket", "Lajpat Nagar", "Vasant Kunj", "Connaught Place"],
    localContext: `Delhi has one of the highest gym densities per capita in India, with major fitness chains concentrated across South Delhi (Saket, Lajpat Nagar, Greater Kailash), the Dwarka and Vasant Kunj corridors, and the professional clusters near Connaught Place. Delhi gym-goers tend to be results-driven and supplement-aware, making them among the highest per-visit spenders on post-workout nutrition in the country.

The city's extreme climate — scorching summers and cold winters — creates year-round variation in gym traffic, but the post-workout nutrition window remains consistent regardless of season. Protein shake dispensers in Delhi gyms typically see peak usage during morning (6–9 AM) and evening (6–9 PM) sessions, aligning with the city's split-shift workout culture.

MuscleBoxPro is expanding across Delhi with a focus on gyms in South Delhi and Dwarka that serve 200+ active daily members. Our zero-upfront-cost installation model is particularly well-suited to Delhi's high-traffic, multi-session gym formats where the volume of post-workout nutrition demand justifies rapid payback on the revenue-sharing arrangement.`,
    cityFaq: {
      q: "Which Delhi areas have MuscleBoxPro machines?",
      a: "MuscleBoxPro is currently expanding across gyms in South Delhi (Saket, Lajpat Nagar, GK), Dwarka, and the Connaught Place corporate fitness belt. Request a demo to check availability in your area.",
    },
    ctaNeighborhood: "your South Delhi or Dwarka gym",
  },
  mumbai: {
    name: "Mumbai",
    neighborhoods: ["Bandra", "Andheri", "Juhu", "Powai", "Lower Parel", "BKC", "Borivali"],
    localContext: `Mumbai's fitness culture is defined by its western suburbs corridor — Bandra, Andheri, and Juhu host a concentration of premium gyms serving the city's media, entertainment, and finance professionals. The Lower Parel–BKC belt has seen explosive gym growth driven by corporate office density, with members squeezing workouts into early mornings or lunch breaks and seeking immediate post-workout nutrition before their next meeting.

Powai has emerged as a standalone micro-market, with Hiranandani's tech-professional resident base creating strong demand for convenient, high-quality nutrition. Space constraints in Mumbai gyms make compact automated dispensers particularly practical — a MuscleBoxPro machine occupies less than 10 sq ft, a meaningful advantage in a city where floor space is priced at a premium.

Machine usage data from Mumbai partner gyms shows a strong skew toward chocolate and banana-based shakes, reflecting the city's preference for richer, indulgent flavours even in post-workout nutrition. MuscleBoxPro's 12-blend menu covers this preference while also offering lighter, whey-isolate options for members focused on lean gains.`,
    cityFaq: {
      q: "Which Mumbai areas is MuscleBoxPro expanding to?",
      a: "We're rolling out across gyms in Bandra, Andheri, Lower Parel, and Powai — Mumbai's highest gym-density corridors. Contact us to request a machine for your gym.",
    },
    ctaNeighborhood: "your Bandra, Andheri, or Lower Parel gym",
  },
  bangalore: {
    name: "Bangalore",
    neighborhoods: ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "Marathahalli", "JP Nagar", "Electronic City"],
    localContext: `Bangalore's fitness market is driven by one of India's youngest and most health-conscious working populations. The city's tech sector has created a gym-going demographic that is highly supplement-literate — Bangalore gym members are more likely than the national average to research protein products, track macros, and seek premium post-workout nutrition.

Indiranagar and Koramangala are the densest zones for premium gym formats, while the Whitefield–Marathahalli corridor serves the IT park workforce who prefer convenient, consistent nutrition around long office hours. HSR Layout has emerged as a strong mid-market gym zone with rapid membership growth. JP Nagar and Electronic City serve the southern tech corridor's large working population.

Bangalore's moderate climate supports year-round high-intensity training, making consistent post-workout protein intake especially important for members who train five or more days per week. Plant-based protein variants see disproportionately strong demand in Bangalore relative to other Indian cities — a trend MuscleBoxPro's vegan shake options are designed to serve.`,
    cityFaq: {
      q: "Which Bangalore areas does MuscleBoxPro serve?",
      a: "MuscleBoxPro is targeting gyms in Indiranagar, Koramangala, HSR Layout, and Whitefield. Submit a demo request to confirm availability near you.",
    },
    ctaNeighborhood: "your Indiranagar or Koramangala gym",
  },
  hyderabad: {
    name: "Hyderabad",
    neighborhoods: ["Banjara Hills", "Jubilee Hills", "Gachibowli", "HITEC City", "Kondapur", "Madhapur"],
    localContext: `Hyderabad's fitness market has grown rapidly alongside the HITEC City and Gachibowli tech corridor, which now anchors one of India's most active gym-going demographics outside Mumbai and Bangalore. The Banjara Hills–Jubilee Hills belt hosts premium fitness studios and large-format gyms serving Hyderabad's high-income residential base, while Kondapur and Madhapur serve the mid-market tech workforce.

Hyderabad gym members tend to train after office hours (6–9 PM), creating a concentrated peak demand window for post-workout nutrition that an automated dispenser is ideally positioned to capture. The city's fitness community has shown strong engagement with locally relevant flavours, and MuscleBoxPro's customisable menu adapts to regional preferences across whey, plant-based, and milk-based variants.

Hyderabad's moderate property costs relative to Mumbai and Bangalore mean that gyms here tend to have more floor space, making machine placement flexible. The city's strong growth trajectory in the fitness segment makes it a high-priority expansion market for MuscleBoxPro's pan-India rollout.`,
    cityFaq: {
      q: "Is MuscleBoxPro available in Hyderabad?",
      a: "Yes, MuscleBoxPro is expanding in Hyderabad with a focus on gyms in Gachibowli, HITEC City, and Banjara Hills. Request a demo to discuss installation at your gym.",
    },
    ctaNeighborhood: "your Gachibowli or Banjara Hills gym",
  },
  pune: {
    name: "Pune",
    neighborhoods: ["Koregaon Park", "Viman Nagar", "Hinjewadi", "Wakad", "Kothrud", "FC Road", "Baner"],
    localContext: `Pune occupies a unique position in India's fitness landscape — it combines a large student and young-professional population with a strong legacy of fitness culture. Koregaon Park and Viman Nagar host the upscale gym segment, while the Hinjewadi–Wakad IT corridor has seen explosive gym growth as tech parks have attracted a large working-age population with disposable income and genuine supplement awareness.

FC Road and Baner are popular with college-aged members who are highly price-sensitive but nutrition-conscious, representing strong demand for accessible post-workout options. Kothrud serves a mix of residential members across age groups. Pune's long commutes into the IT parks create a strong preference for one-stop gym experiences where training and nutrition are handled in the same visit.

MuscleBoxPro's zero-cost installation model is well-suited to Pune gyms at all price points — from premium studios in Koregaon Park to high-volume mid-market gyms in Hinjewadi. Post-workout shake demand in Pune skews toward lighter, lower-calorie options among the younger demographic, a preference well-served by MuscleBoxPro's whey isolate and plant-based blends.`,
    cityFaq: {
      q: "Which Pune areas does MuscleBoxPro cover?",
      a: "We're actively expanding in the Hinjewadi–Wakad IT belt, Koregaon Park, and Viman Nagar. Reach out to request a machine installation for your gym.",
    },
    ctaNeighborhood: "your Hinjewadi or Koregaon Park gym",
  },
  chennai: {
    name: "Chennai",
    neighborhoods: ["Anna Nagar", "T Nagar", "Adyar", "Velachery", "OMR", "Porur", "Nungambakkam"],
    localContext: `Chennai's gym market is characterised by strong loyalty and long membership tenures — once Chennai gym-goers find a gym they trust, they stay. The city's fitness culture is pragmatic: members prioritise results and value-for-money over facility aesthetics. Anna Nagar and T Nagar serve the city's dense residential population, while the OMR corridor has seen significant gym growth tied to IT park expansion.

Adyar and Velachery are established mid-market gym zones with consistent year-round traffic. Porur serves the western suburbs' growing professional population. Chennai's hot and humid climate creates particularly high hydration and protein needs post-workout — members typically exit training sessions in a depleted state that makes an immediate, chilled protein shake highly appealing and physically beneficial.

This climate factor makes Chennai one of the strongest markets for post-workout nutrition dispensers from a pure usage-frequency standpoint. MuscleBoxPro machines serve chilled shakes — a feature that aligns strongly with Chennai members' post-workout needs during the city's long, intense summer season throughout the year.`,
    cityFaq: {
      q: "Is MuscleBoxPro available in Chennai?",
      a: "MuscleBoxPro is expanding across Anna Nagar, OMR, and Velachery. If you own or manage a gym in Chennai, request a demo to discuss a free machine installation.",
    },
    ctaNeighborhood: "your Anna Nagar or OMR gym",
  },
  ahmedabad: {
    name: "Ahmedabad",
    neighborhoods: ["Vastrapur", "Bodakdev", "SG Highway", "Navrangpura", "Satellite", "Prahlad Nagar"],
    localContext: `Ahmedabad's fitness market is growing faster than most tier-1 Indian cities, driven by a young entrepreneurial and professional population that is increasingly health-conscious. The SG Highway and Bodakdev corridors anchor the city's premium gym segment, with Vastrapur and Prahlad Nagar serving a younger, price-aware demographic. Navrangpura and Satellite serve established residential and commercial gym markets.

Ahmedabad's business culture means many gym members train early in the morning before long workdays, creating strong demand for fast, convenient post-workout nutrition. Notably, Ahmedabad's largely vegetarian population shows exceptionally high demand for plant-based and milk-based protein variants — a preference that MuscleBoxPro's menu addresses directly with multiple vegan and dairy-based options alongside whey isolate.

The city's strong entrepreneurial culture also makes Ahmedabad gym owners among India's most receptive to the MuscleBoxPro revenue-sharing model. The concept of turning floor space into a passive income stream resonates strongly with the city's business-minded gym owner community, making conversations about installation quick and straightforward.`,
    cityFaq: {
      q: "Does MuscleBoxPro serve Ahmedabad gyms?",
      a: "Yes, we're expanding in Ahmedabad with a focus on SG Highway, Bodakdev, and Vastrapur. Contact us to request a machine for your fitness centre.",
    },
    ctaNeighborhood: "your SG Highway or Bodakdev gym",
  },
  kolkata: {
    name: "Kolkata",
    neighborhoods: ["Salt Lake", "New Town", "Park Street", "Ballygunge", "Alipore", "Bhowanipore"],
    localContext: `Kolkata's fitness market is at an inflection point — a city historically known for football and outdoor activity is experiencing rapid growth in the premium gym segment. Salt Lake's Sector V tech hub and the upscale Park Street–Ballygunge belt are driving this shift, with New Town (Rajarhat) emerging as a significant new gym market built on a growing base of young professional residents.

Kolkata gym members tend to have longer average workout sessions compared to other Indian cities, making the post-workout nutrition window particularly well-defined. The city's strong culinary culture influences shake preferences: milk-based and banana-based variants perform strongly, reflecting a preference for richer, more indulgent flavour profiles even in post-workout nutrition.

Salt Lake's IT workforce brings Kolkata's supplement literacy increasingly in line with Bangalore and Pune. MuscleBoxPro's entry into Kolkata targets the Salt Lake and New Town markets first, where gym infrastructure and member demographics align most closely with the consumption patterns seen in more established MuscleBoxPro expansion cities.`,
    cityFaq: {
      q: "Is MuscleBoxPro available in Kolkata?",
      a: "MuscleBoxPro is targeting gyms in Salt Lake, New Town, and the Park Street fitness corridor. Submit a demo request to explore installation options for your gym.",
    },
    ctaNeighborhood: "your Salt Lake or New Town gym",
  },
  chandigarh: {
    name: "Chandigarh",
    neighborhoods: ["Sector 17", "Sector 34", "Sector 35", "Mohali", "Panchkula", "Aerocity"],
    localContext: `Chandigarh consistently ranks among India's most health-conscious cities per capita — a distinction supported by the city's planned infrastructure, high income levels, and a strong civic culture around outdoor fitness and sport. The sector-based layout creates natural gym clusters in Sector 34, 35, and the commercial zone around Sector 17. Mohali's expanding IT and industrial base has created a secondary gym market growing at pace, while Panchkula serves the residential spillover from both cities.

Chandigarh gym members are among India's highest per-workout spenders on supplements. The tri-city area's strong military and sports heritage means members here tend to be disciplined, high-frequency trainers with genuine nutritional awareness — a profile that aligns strongly with consistent use of an automated protein dispenser. Morning training sessions are particularly common, creating early-day demand for post-workout nutrition.

MuscleBoxPro's expansion into the Chandigarh tri-city area targets Sector 34/35 and the Mohali IT corridor first, where gym density and member spending capacity are highest. The city's compact geography also makes supply chain logistics efficient for the ingredient restocking that powers the machine.`,
    cityFaq: {
      q: "Does MuscleBoxPro operate in Chandigarh?",
      a: "Yes, MuscleBoxPro is expanding in Chandigarh with a focus on Sector 34/35, Sector 17, and the Mohali IT corridor. Contact us to discuss a free machine installation for your gym.",
    },
    ctaNeighborhood: "your Sector 34 or Mohali gym",
  },
  gurgaon: {
    name: "Gurgaon",
    neighborhoods: ["Cyber Hub", "DLF Phases", "Golf Course Road", "Sohna Road", "Udyog Vihar", "MG Road"],
    localContext: `Gurgaon is arguably India's most fitness-intense urban market outside Mumbai. The city's corporate workforce — with a median age below 32 and high disposable income — has created a premium gym density that rivals global tier-1 cities. Cyber Hub and the DLF phases host flagship gyms from every major Indian and international brand, with members who are highly aware of nutrition science and willing to pay premium prices for quality supplements.

Golf Course Road and Sohna Road serve an upscale residential demographic with correspondingly high expectations for gym facilities and on-site nutrition. The post-workout nutrition gap in Gurgaon gyms is particularly acute: members train intensely, often twice daily, and demand convenient, high-quality protein immediately after sessions. Gurgaon's long office hours create a strong preference for bundled gym-nutrition experiences rather than multi-stop purchasing.

Machine usage data from Gurgaon gyms skews heavily toward premium whey isolate variants, reflecting the city's more sophisticated supplement literacy. MuscleBoxPro is prioritising Gurgaon as an expansion market due to the high transaction volume per machine that the city's gym density and member spending patterns support.`,
    cityFaq: {
      q: "Which Gurgaon areas is MuscleBoxPro expanding into?",
      a: "Gurgaon is a priority expansion market for us. We're targeting gyms along Cyber Hub, the DLF phases, Golf Course Road, and Sohna Road. Request a demo to confirm availability.",
    },
    ctaNeighborhood: "your Cyber Hub or Golf Course Road gym",
  },
  noida: {
    name: "Noida",
    neighborhoods: ["Sector 18", "Sector 62", "Sector 137", "Sector 150", "Greater Noida", "Film City"],
    localContext: `Noida has emerged as one of Delhi-NCR's fastest-growing gym markets, driven by its large IT sector workforce and a wave of residential development in the high-sector zones (100+). Sector 18 and Sector 62 host established gym clusters serving the city's commercial and professional core, while Sector 137 and the newer sectors serve a younger residential population that is fitness-aware and supplement-conscious.

Greater Noida is a distinct sub-market with a growing middle-class population and newer, larger-format gyms that benefit from lower property costs. The tech-worker demographic that dominates Noida's working population — typically in their 20s and early 30s — is the segment most likely to actively use post-workout protein supplementation, aligning well with MuscleBoxPro's core user profile.

Noida holds a special significance for MuscleBoxPro: the company is headquartered in Sector 75, meaning Noida is the market where operational presence is strongest and response times for machine support, restocking, and partner relations are fastest. For Noida gym owners, this translates to the most hands-on partnership experience in MuscleBoxPro's network.`,
    cityFaq: {
      q: "Is MuscleBoxPro available in Noida?",
      a: "Noida is our home market — MuscleBoxPro is headquartered in Sector 75 and has strong operational coverage across Sector 18, Sector 62, and the emerging sectors. Contact us to request a machine installation.",
    },
    ctaNeighborhood: "your Sector 18 or Sector 62 gym",
  },
};

type CitySlug = keyof typeof cityConfig;

function getCityFromSlug(slug: string) {
  return cityConfig[slug as CitySlug] ?? null;
}

export function generateStaticParams() {
  return Object.keys(cityConfig).map((city) => ({ city }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  return params.then(({ city: citySlug }) => {
    const city = getCityFromSlug(citySlug);
    if (!city) {
      return { title: "Protein Vending Machine for Gyms | MuscleBoxPro" };
    }
    return {
      title: `Protein Vending Machine for Gyms in ${city.name} | MuscleBoxPro`,
      description: `Install a protein vending machine for gyms in ${city.name}. Automated fresh protein shakes in 60 seconds, zero upfront cost, passive revenue for fitness centres across ${city.neighborhoods.slice(0, 3).join(", ")} and more.`,
      alternates: {
        canonical: `/protein-vending-machine-${citySlug}`,
      },
      openGraph: {
        type: "website",
        url: `/protein-vending-machine-${citySlug}`,
        title: `Protein Vending Machine for Gyms in ${city.name} | MuscleBoxPro`,
        description: `Install a protein vending machine for gyms in ${city.name}. Automated fresh protein shakes in 60 seconds, zero upfront cost, passive revenue for fitness centres.`,
      },
    };
  });
}

export default async function ProteinVendingMachineCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const resolvedParams = await params;
  const citySlug = resolvedParams.city;
  const city = getCityFromSlug(citySlug) ?? cityConfig.delhi;

  const { name, ...cityData } = city;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.muscleboxpro.com/" },
      { "@type": "ListItem", position: 2, name: "Protein Vending Machine India", item: "https://www.muscleboxpro.com/protein-vending-machine-india" },
      { "@type": "ListItem", position: 3, name: `Protein Vending Machine ${name}`, item: `https://www.muscleboxpro.com/protein-vending-machine-${citySlug}` },
    ],
  };

  const serviceAreaSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `https://www.muscleboxpro.com/protein-vending-machine-${citySlug}#service`,
    name: `Protein Shake Vending Machine for Gyms in ${name}`,
    description: `Automated protein shake vending machine installation and operation for gyms in ${name}. Zero upfront cost, revenue-sharing model, complete maintenance included.`,
    provider: {
      "@type": "Organization",
      "@id": "https://www.muscleboxpro.com/#organization",
    },
    areaServed: {
      "@type": "City",
      name,
      addressCountry: "IN",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      description: "Free machine installation with revenue-sharing model",
      availability: "https://schema.org/InStock",
      priceValidUntil: "2027-03-31",
    },
  };

  return (
    <>
      <ProteinVendingMachineIndia cityName={name} cityData={cityData} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceAreaSchema) }} />
    </>
  );
}
