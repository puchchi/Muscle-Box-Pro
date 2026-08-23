import type { Metadata } from "next";
import AdminLogin from "@/pages/admin/AdminLogin";

/**
 * `noindex, nofollow` — and this is the control that matters, not robots.txt. Several
 * crawlers there are given a blanket `Allow: /` in their own block, which overrides the
 * wildcard `Disallow`, so a header is the only instruction they all honour. `follow: false`
 * as well as `index: false`, unlike the gym login: nothing here is worth discovering.
 */
export const metadata: Metadata = {
  title: "Admin | MuscleBoxPro",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminLogin />;
}
