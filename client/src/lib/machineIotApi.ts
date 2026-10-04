import type * as z from "zod";
import { apiBaseUrl, machineApiRequest, type ApiMethod } from "./apiClient";
import type { MachineCall } from "./adminMachineApi";
import { parseWith } from "@shared/admin/machinesSchema";
import {
  commandEnvelopeSchema,
  enrolSchema,
  liveSchema,
  revokeSchema,
  sessionEnvelopeSchema,
  type CommandArgs,
  type CommandName,
} from "@shared/admin/remoteSchema";

export const machineIotConfigured = () => apiBaseUrl("machineIot") !== null;

async function call<S extends z.ZodTypeAny>(schema: S, method: ApiMethod, path: string, body?: unknown): Promise<MachineCall<z.infer<S>>> {
  const result = await machineApiRequest<unknown>(method, path, body, "machineIot");
  if (!result.ok) return { ok: false, error: result.error, issues: [] };
  const parsed = parseWith(schema, result.data);
  if (!parsed.ok) {
    return {
      ok: false,
      error: { code: "network", message: "The server answered in a shape this page does not understand. The details are below." },
      issues: parsed.issues,
    };
  }
  return { ok: true, data: parsed.data };
}

const machine = (sn: string) => `/machines/${encodeURIComponent(sn)}`;

export const enrolMqtt = (sn: string) => call(enrolSchema, "POST", `${machine(sn)}/mqtt/enrol`, {});

export const revokeMqtt = (sn: string) => call(revokeSchema, "POST", `${machine(sn)}/mqtt/revoke`, {});

export const sendCommand = (sn: string, name: CommandName, args?: CommandArgs) =>
  call(commandEnvelopeSchema, "POST", `${machine(sn)}/commands`, args ? { name, args } : { name });

export const fetchCommand = (sn: string, id: string) =>
  call(commandEnvelopeSchema, "GET", `${machine(sn)}/commands/${encodeURIComponent(id)}`);

export const cancelCommand = (sn: string, id: string) =>
  call(commandEnvelopeSchema, "DELETE", `${machine(sn)}/commands/${encodeURIComponent(id)}`);

export const openSession = (sn: string, seconds: number) => call(sessionEnvelopeSchema, "POST", `${machine(sn)}/session`, { seconds });

export const endSession = (sn: string) => call(sessionEnvelopeSchema, "DELETE", `${machine(sn)}/session`);

export const fetchLive = (sn: string) => call(liveSchema, "GET", `${machine(sn)}/live`);
