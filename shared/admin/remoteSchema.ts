import * as z from "zod";

const instant = z.string().nullable();
const orNull = <S extends z.ZodTypeAny>(schema: S) =>
  schema.nullable().optional().transform((v): z.infer<S> | null => v ?? null);

export const MQTT_STATES = ["connected", "not_connected", "no_certificate", "not_issued_to_this_tablet"] as const;
export type MqttState = (typeof MQTT_STATES)[number];

export const mqttSchema = z.object({
  state: z.enum(MQTT_STATES),
  online: z.boolean(),
  certificate: z
    .object({
      fingerprint: z.string(),
      issuedAt: instant,
      sourceIp: orNull(z.string()),
      codeCreatedBy: orNull(z.string()),
    })
    .nullable(),
  pendingCode: z.object({ createdBy: z.string(), expiresAt: z.string() }).nullable(),
});

export type MachineMqtt = z.infer<typeof mqttSchema>;

export const enrolSchema = z.object({
  sn: z.string(),
  code: z.string().regex(/^\d{8}$/),
  expiresAt: z.string(),
  validForSeconds: z.number().int().positive(),
});

export const revokeSchema = z.object({ sn: z.string(), retired: z.number().int().min(0) });

export const COMMAND_STATES = ["sent", "running", "done", "failed", "refused", "expired", "cancelled"] as const;
export type CommandState = (typeof COMMAND_STATES)[number];

const FINAL_STATES: ReadonlySet<CommandState> = new Set(["done", "failed", "refused", "expired", "cancelled"]);
export const isFinalState = (state: CommandState) => FINAL_STATES.has(state);

export const COMMAND_NAMES = [
  "clean",
  "resetTrack",
  "doorOpen",
  "doorClose",
  "lock",
  "unlock",
  "addWater",
  "empty",
  "uploadLog",
  "reloadAll",
  "restartApp",
  "reboot",
] as const;
export type CommandName = (typeof COMMAND_NAMES)[number];

export type CommandArgs = { times: number; grounds: boolean } | { date: string } | Record<string, never>;

export const commandSchema = z.object({
  id: z.string(),
  sn: z.string(),
  name: z.string(),
  args: z.record(z.unknown()).nullable().optional().transform((v) => v ?? {}),
  by: z.string(),
  state: z.enum(COMMAND_STATES),
  reason: orNull(z.string()),
  detail: orNull(z.string()),
  createdAt: instant,
  expiresAt: instant,
  claimedAt: orNull(z.string()),
  finishedAt: orNull(z.string()),
});

export type RemoteCommand = z.infer<typeof commandSchema>;

export const commandEnvelopeSchema = z.object({ command: commandSchema });

export const remoteSessionSchema = z.object({
  id: z.string(),
  by: z.string(),
  until: z.string(),
  secondsLeft: z.number().int(),
});

export type RemoteSession = z.infer<typeof remoteSessionSchema>;

export const sessionEnvelopeSchema = z.object({ session: remoteSessionSchema.nullable() });

export const liveStatusSchema = z.object({
  step: orNull(z.string()),
  making: orNull(z.boolean()),
  boardOnline: orNull(z.boolean()),
  faults: z
    .array(z.object({ code: z.string(), text: z.string() }))
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  hotTemp: orNull(z.number()),
  coldTemp: orNull(z.number()),
  door: orNull(z.enum(["open", "closed"])),
  cupPresent: orNull(z.boolean()),
  lastDrinkAt: orNull(z.number()),
  appVersion: orNull(z.string()),
  mqtt: orNull(z.boolean()),
  network: orNull(z.string()),
});

export type LiveStatus = z.infer<typeof liveStatusSchema>;

export const liveSchema = z.object({
  sn: z.string(),
  mqttOnline: z.boolean(),
  session: remoteSessionSchema.nullable(),
  status: liveStatusSchema.nullable(),
  statusAt: instant,
  statusAgeSeconds: z.number().int().min(0).nullable(),
});

export type MachineLive = z.infer<typeof liveSchema>;
