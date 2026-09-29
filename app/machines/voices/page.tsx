import type { Metadata } from "next";
import AdminMachineVoices from "@/pages/admin/AdminMachineVoices";

export const metadata: Metadata = {
  title: "Voice prompts | MBP machines",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminMachineVoices />;
}
