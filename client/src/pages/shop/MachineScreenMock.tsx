import { Check, CreditCard, CupSoda, Pointer } from "lucide-react";
import { SHOP_COPY } from "./shopCopy";

const QR_SIZE = 21;

function finder(x: number, y: number): boolean | null {
  for (const [ox, oy] of [
    [0, 0],
    [QR_SIZE - 7, 0],
    [0, QR_SIZE - 7],
  ] as const) {
    const dx = x - ox;
    const dy = y - oy;
    if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
      if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false;
      const ring = Math.min(dx, dy, 6 - dx, 6 - dy);
      return ring !== 1;
    }
  }
  return null;
}

const QR_CELLS = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
  const x = i % QR_SIZE;
  const y = Math.floor(i / QR_SIZE);
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return finder(x, y) ?? ((h ^ (h >>> 16)) & 1) === 1;
});

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "Delete", "Submit"];
const STEPS = [
  { label: "Select", Icon: Pointer },
  { label: "Pay", Icon: CreditCard },
  { label: "Making", Icon: CupSoda },
  { label: "Enjoy", Icon: Check },
];

export function MachineScreenMock() {
  return (
    <figure className="mx-auto mt-12 max-w-3xl" data-testid="shop-machine-mock">
      <div className="rounded-[1.75rem] bg-gray-900 p-2.5 shadow-2xl shadow-gray-900/20 sm:p-3.5" aria-hidden>
        <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-white [container-type:inline-size]">
          <div className="flex h-[19%] items-center justify-between bg-black px-[3cqw]">
            <span className="text-[2cqw] font-black tracking-wide text-white">
              <span className="text-primary">MUSCLE</span>BOXPRO
            </span>
            <span className="flex items-center gap-[2.4cqw]">
              {STEPS.map(({ label, Icon }, i) => (
                <span key={label} className={`flex flex-col items-center gap-[0.4cqw] text-[1.3cqw] ${i === 0 ? "text-[#f2c36b]" : "text-white"}`}>
                  <Icon className="h-[2.2cqw] w-[2.2cqw]" />
                  {label}
                </span>
              ))}
            </span>
            <span className="w-[10cqw]" />
          </div>

          <div className="grid h-[81%] grid-cols-2">
            <div className="flex flex-col items-center px-[3cqw] pt-[3.5cqw] opacity-45">
              <p className="text-[2.2cqw] text-gray-900">1. Scan to order from your account</p>
              <div className="mt-[3cqw] grid w-[22cqw] grid-cols-[repeat(21,minmax(0,1fr))]">
                {QR_CELLS.map((on, i) => (
                  <span key={i} className={`aspect-square ${on ? "bg-gray-900" : ""}`} />
                ))}
              </div>
            </div>

            <div className="relative flex flex-col items-center px-[3cqw] pt-[3.5cqw]">
              <span className="pointer-events-none absolute inset-[1.2cqw] rounded-[1.5cqw] ring-[0.35cqw] ring-primary" />
              <p className="text-[2.2cqw] font-semibold text-gray-900">2. Enter code to start drink</p>
              <div className="mt-[2cqw] flex h-[6cqw] w-[34cqw] items-center justify-center gap-[1cqw] rounded-[0.4cqw] border border-gray-300 bg-gray-50 font-mono text-[2.4cqw] font-bold tracking-[0.3em] text-gray-900">
                4821 3907
              </div>
              <div className="mt-[1.6cqw] grid w-[38cqw] grid-cols-3 gap-[1cqw]">
                {KEYS.map((key) => (
                  <span
                    key={key}
                    className={`flex h-[5.4cqw] items-center justify-center rounded-[0.4cqw] border text-[1.6cqw] ${
                      key === "Submit" ? "border-[#f2c36b] bg-[#f2c36b] font-semibold text-gray-900" : "border-gray-300 bg-gray-50 text-gray-800"
                    }`}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">{SHOP_COPY.machineCaption}</figcaption>
    </figure>
  );
}
