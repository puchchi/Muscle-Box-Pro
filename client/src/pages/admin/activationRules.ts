import { isPendingDeviceNo, type AdminGymView } from "@shared/admin/gyms";
import { formatCalendarDate } from "./adminFormat";

export const MIN_WAIVER_REASON = 10;
export const MAX_WAIVER_REASON = 500;

export type ActivationCheck = { key: "signed" | "machine" | "deposit"; label: string; ok: boolean; detail: string };

export function activationChecks(gym: AdminGymView): ActivationCheck[] {
  const { deviceNo, installationDate } = gym.machine;
  const realUnit = deviceNo !== null && !isPendingDeviceNo(deviceNo);
  const paid = gym.depositStatus === "paid";
  return [
    {
      key: "signed",
      label: "Agreement signed",
      ok: gym.timestamps.signedAt !== null,
      detail: gym.timestamps.signedAt === null ? "The gym hasn't signed yet." : gym.signature ? `Version ${gym.signature.agreementVersion}.` : "Signed.",
    },
    {
      key: "machine",
      label: "Machine installed",
      ok: realUnit && installationDate !== null,
      detail: !realUnit
        ? "No machine is placed at this gym yet."
        : installationDate === null
          ? `${deviceNo} has no installation date. Add one in the Machine section.`
          : `${deviceNo}, installed ${formatCalendarDate(installationDate)}.`,
    },
    {
      key: "deposit",
      label: "Security deposit",
      ok: paid,
      detail: paid ? "Paid." : "Not paid. You can still activate if you give a reason for waiving it.",
    },
  ];
}

export type ActivationPlan =
  | { ready: true; body: { notifyGym: boolean; depositWaiver?: { reason: string } } }
  | { ready: false; message: string };

export function planActivation(gym: AdminGymView, waiverReason: string, notifyGym: boolean): ActivationPlan {
  const blocking = activationChecks(gym).filter((c) => !c.ok && c.key !== "deposit");
  if (blocking.length > 0) return { ready: false, message: blocking.map((c) => c.detail).join(" ") };
  if (gym.depositStatus === "paid") return { ready: true, body: { notifyGym } };
  const reason = waiverReason.trim();
  if (reason.length < MIN_WAIVER_REASON) {
    return { ready: false, message: `Give a reason for waiving the deposit, at least ${MIN_WAIVER_REASON} characters.` };
  }
  if (reason.length > MAX_WAIVER_REASON) return { ready: false, message: `Keep the reason under ${MAX_WAIVER_REASON} characters.` };
  return { ready: true, body: { notifyGym, depositWaiver: { reason } } };
}

const PLAIN: Array<[RegExp, string]> = [
  [/Set one with PUT \S+\./g, "Add one in the Machine section."],
  [/Activate with an explicit depositWaiver\.reason to proceed without it\./g, "Give a reason to waive it."],
];

export const plainActivationMessage = (message: string) => PLAIN.reduce((text, [pattern, plain]) => text.replace(pattern, plain), message);
