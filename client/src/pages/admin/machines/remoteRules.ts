import type { CommandName, LiveStatus, MqttState, RemoteCommand } from "@shared/admin/remoteSchema";

export const COMMAND_POLL_MS = 2_000;
export const LIVE_POLL_MS = 5_000;
export const STALE_STATUS_SECONDS = 15;
export const SESSION_LENGTHS = [60, 120, 300, 600] as const;

export const formatEnrolCode = (code: string) => (code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code);

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export const MQTT_STATE_LABEL: Record<MqttState, { text: string; className: string }> = {
  connected: { text: "Connected", className: "bg-emerald-400/15 text-emerald-200" },
  not_connected: { text: "Not connected", className: "bg-secondary text-muted-foreground" },
  no_certificate: { text: "Not set up", className: "bg-secondary text-muted-foreground" },
  not_issued_to_this_tablet: { text: "Unknown certificate", className: "bg-rose-400/15 text-rose-200" },
};

export type CommandSpec = { name: CommandName; label: string; confirm?: { title: string; message: string; label: string } };

export const COMMAND_GROUPS: ReadonlyArray<{ title: string; commands: ReadonlyArray<CommandSpec> }> = [
  {
    title: "Cleaning",
    commands: [
      { name: "clean", label: "Clean pipes" },
      { name: "resetTrack", label: "Reset track" },
    ],
  },
  {
    title: "Door and lock",
    commands: [
      { name: "doorOpen", label: "Open door" },
      { name: "doorClose", label: "Close door" },
      { name: "lock", label: "Lock" },
      {
        name: "unlock",
        label: "Unlock",
        confirm: {
          title: "Unlock the machine?",
          message: "The machine's lock opens. Do it only when someone you trust is at the machine.",
          label: "Unlock",
        },
      },
    ],
  },
  {
    title: "Water",
    commands: [
      { name: "addWater", label: "Add water" },
      { name: "empty", label: "Empty" },
    ],
  },
  {
    title: "App",
    commands: [
      { name: "uploadLog", label: "Upload log" },
      { name: "reloadAll", label: "Re-read everything" },
      {
        name: "restartApp",
        label: "Restart app",
        confirm: {
          title: "Restart the app?",
          message: "The screen goes blank for up to 30 seconds. Nobody can buy a drink until it is back.",
          label: "Restart app",
        },
      },
      {
        name: "reboot",
        label: "Reboot",
        confirm: {
          title: "Reboot the machine's tablet?",
          message: "It is off for a minute or two. Nobody can buy a drink until it is back.",
          label: "Reboot",
        },
      },
    ],
  },
];

const LABELS = new Map(COMMAND_GROUPS.flatMap((g) => g.commands.map((c) => [c.name as string, c.label])));

export function commandLabel(command: Pick<RemoteCommand, "name" | "args">): string {
  const label = LABELS.get(command.name) ?? command.name;
  if (command.name === "clean") {
    const times = typeof command.args.times === "number" ? command.args.times : 1;
    return `${label} ×${times}${command.args.grounds === true ? ", and the grounds" : ""}`;
  }
  if (command.name === "uploadLog") {
    return typeof command.args.date === "string" && command.args.date ? `${label} for ${command.args.date}` : `${label} for today`;
  }
  return label;
}

const REFUSALS: Record<string, string> = {
  busy: "it is making a drink",
  inUse: "a customer is using the screen",
  settings: "the operator screens are open",
  boardOffline: "its board is offline",
  unknown: "its app doesn't know this command",
};

export const COMMAND_STATE_LABEL: Record<RemoteCommand["state"], { text: string; className: string }> = {
  sent: { text: "Waiting", className: "bg-amber-400/10 text-amber-200" },
  running: { text: "Running", className: "bg-amber-400/10 text-amber-200" },
  done: { text: "Done", className: "bg-emerald-400/15 text-emerald-200" },
  failed: { text: "Failed", className: "bg-rose-400/15 text-rose-200" },
  refused: { text: "Refused", className: "bg-rose-400/15 text-rose-200" },
  expired: { text: "Expired", className: "bg-secondary text-muted-foreground" },
  cancelled: { text: "Cancelled", className: "bg-secondary text-muted-foreground" },
};

export function commandOutcome(command: RemoteCommand): string {
  switch (command.state) {
    case "sent":
      return "Waiting for the machine to pick it up.";
    case "running":
      return "Running on the machine.";
    case "done":
      return command.name === "restartApp" || command.name === "reboot"
        ? "Done. The machine is going down now. It shows MQTT connected again once it is back."
        : "Done.";
    case "refused": {
      const why = command.reason ? (REFUSALS[command.reason] ?? command.reason) : null;
      return why ? `The machine said not now: ${why}. Nothing ran.` : "The machine said not now. Nothing ran.";
    }
    case "failed":
      if (command.reason === "publish") return "The machine couldn't be reached. Nothing ran.";
      return command.detail ? `The machine tried, and it failed: ${command.detail}` : "The machine tried, and it failed.";
    case "expired":
      return "The machine didn't pick it up within a minute. Nothing ran. Send it again if you still need it.";
    case "cancelled":
      return "Cancelled. Nothing ran.";
  }
}

export const statusIsStale = (ageSeconds: number | null) => ageSeconds === null || ageSeconds > STALE_STATUS_SECONDS;

const yesNo = (v: boolean | null, yes: string, no: string) => (v === null ? null : v ? yes : no);
const degrees = (v: number | null) => (v === null ? null : `${v} °C`);

export function liveRows(status: LiveStatus, formatTime: (epochMs: number) => string): Array<{ label: string; value: string | null }> {
  return [
    { label: "Screen", value: status.step },
    { label: "Making a drink", value: yesNo(status.making, "Yes", "No") },
    { label: "Board", value: yesNo(status.boardOnline, "Online", "Offline") },
    { label: "Hot water", value: degrees(status.hotTemp) },
    { label: "Cold water", value: degrees(status.coldTemp) },
    { label: "Door", value: status.door === null ? null : status.door === "open" ? "Open" : "Closed" },
    { label: "Cup in place", value: yesNo(status.cupPresent, "Yes", "No") },
    { label: "Last drink", value: status.lastDrinkAt === null ? null : formatTime(status.lastDrinkAt) },
    { label: "App version", value: status.appVersion },
    { label: "MQTT", value: yesNo(status.mqtt, "Connected", "Not connected") },
    { label: "Network", value: status.network },
  ];
}
