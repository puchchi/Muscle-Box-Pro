/**
 * The legal entity behind the site, as one set of facts.
 *
 * Extracted because three surfaces name it and two of them already carried the same
 * postal address: the `Organization` and `ProfessionalService` JSON-LD in
 * `app/layout.tsx`, and the publisher line on /franchise, where a ₹25–50 lakh commitment
 * is being asked for and the page has to say who is asking for it.
 *
 * Contact details a customer uses live wherever they are needed. This is the entity, for
 * the places that have to be right about who we legally are.
 */

export const COMPANY = {
  brandName: "MuscleBoxPro",

  /**
   * The spaced form. It is the franchise program's own spelling, in
   * `shared/franchise/program.ts`, its FAQ and the agreement, so it is not a typo to
   * correct. Published as schema `alternateName` instead, so an engine reading
   * "MuscleBox Pro" on /franchise and "MuscleBoxPro" everywhere else resolves one entity
   * rather than two.
   */
  alternateName: "MuscleBox Pro",

  legalName: "BlendBox Innovations LLP",
  email: "contact@muscleboxpro.com",

  address: {
    streetAddress: "Sector 75",
    locality: "Noida",
    postalCode: "201301",
    region: "Uttar Pradesh",
    country: "IN",
  },
} as const;

/** "Sector 75, Noida 201301, Uttar Pradesh" — the one-line form page copy uses. */
export function addressOneLine(): string {
  const { streetAddress, locality, postalCode, region } = COMPANY.address;
  return `${streetAddress}, ${locality} ${postalCode}, ${region}`;
}

/** The `PostalAddress` node, for the schema graph. */
export function postalAddressSchema() {
  const { streetAddress, locality, postalCode, region, country } = COMPANY.address;
  return {
    "@type": "PostalAddress",
    streetAddress,
    addressLocality: locality,
    postalCode,
    addressRegion: region,
    addressCountry: country,
  };
}
