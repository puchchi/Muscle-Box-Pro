export const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayInstance = { open: () => void; on: (event: string, handler: () => void) => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let loading: Promise<RazorpayConstructor | null> | null = null;

export function loadRazorpayCheckout(): Promise<RazorpayConstructor | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(window.Razorpay ?? null);
    script.onerror = () => {
      loading = null;
      script.remove();
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return loading;
}

export type CheckoutOutcome = "paid" | "closed" | "unavailable";

export async function payWithRazorpay(order: {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  description: string;
}): Promise<CheckoutOutcome> {
  const Razorpay = await loadRazorpayCheckout();
  if (!Razorpay) return "unavailable";
  return new Promise((resolve) => {
    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: "MuscleBoxPro",
      description: order.description,
      theme: { color: "#D03111" },
      handler: () => resolve("paid"),
      modal: { ondismiss: () => resolve("closed"), confirm_close: true },
    });
    checkout.open();
  });
}
