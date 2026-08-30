/**
 * The physical machine, as one set of facts.
 *
 * Extracted because three surfaces describe the same hardware — the public
 * `/specs` page, onboarding step 2, and Schedule A of the agreement — and a gym
 * that reads two of them should not find two different heights. The commercial
 * terms live in `shared/partnership/summary.ts`; this is only the metal.
 *
 * Per-gym facts (device number, serial, installation date, accessories fitted)
 * belong on that gym's machine record, not here. This is the model, not the unit.
 */

export const MACHINE_SPEC = {
  model: "MuscleBoxPro MBP-1",

  /** Centimetres, as ordered in the spec sheet: width × depth × height. */
  widthCm: 76,
  depthCm: 60,
  heightCm: 180,

  displayInches: 27,
  canisters: 7,
  capacityLitres: 28,
  cupCapacity: 70,
  cupMl: 400,
  connectivity: "4G + WiFi",

  /** Product render, used on `/specs` and in onboarding step 2. Portrait, 1024×1535. */
  imageSrc: "/assets/machine/machine_with_plane_bg.png",

  /** Labelled cutaway of the same machine, used on `/specs`. Portrait, 1122×1402. */
  explodedImageSrc: "/assets/machine/machine_explode.png",
} as const;

/** "76×60×180" — the compact form the spec sheet and the key-stats grid use. */
export function dimensionsCm(): string {
  return `${MACHINE_SPEC.widthCm}×${MACHINE_SPEC.depthCm}×${MACHINE_SPEC.heightCm}`;
}

/**
 * "76 cm wide, 60 cm deep, 180 cm tall".
 *
 * Spelled out for step 2, where the question a gym owner is actually asking is
 * "will it fit against that wall" — and `76×60×180` makes them work out which
 * number is which.
 */
export function dimensionsSpelled(): string {
  const { widthCm, depthCm, heightCm } = MACHINE_SPEC;
  return `${widthCm} cm wide, ${depthCm} cm deep, ${heightCm} cm tall`;
}
