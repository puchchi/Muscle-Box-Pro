import { describe, expect, it } from "vitest";
import {
  blankRow,
  istInputValue,
  rowsOf,
  scheduleState,
  validateAdFields,
  validateSchedules,
  whereShown,
  type ScheduleRow,
} from "@/pages/admin/machines/adRules";
import { appStartNotice, checkMedia, formatBytes } from "@/pages/admin/machines/mediaBits";
import { DEFAULT_EXCHANGE_LINK, DEFAULT_MEMBER_LINK, instagramProblem, linkProblem, scanTarget, validateQr } from "@/pages/admin/AdminMachineQr";
import { emptyVoiceFiles, toPositionsInput } from "@/pages/admin/machines/VoiceSlots";

const MB = 1024 * 1024;

const row = (patch: Partial<ScheduleRow> = {}): ScheduleRow => ({
  key: "k",
  allMachines: false,
  sns: ["SN1"],
  start: "2026-10-01T09:00",
  end: "2026-10-31T21:00",
  sort: "1",
  ...patch,
});

const schedule = (startAt: string, endAt: string, patch: { allMachines?: boolean; sns?: string[] } = {}) => ({
  id: "s",
  allMachines: patch.allMachines ?? false,
  sns: patch.sns ?? ["SN1"],
  startAt,
  endAt,
  sort: 0,
});

describe("ad schedules", () => {
  it("sends India time as typed, and keeps known row ids", () => {
    const checked = validateSchedules([row({ id: "abc" }), row({ allMachines: true, sns: ["SN9"] })]);
    expect(checked.input).toEqual([
      { id: "abc", allMachines: false, sns: ["SN1"], start: "2026-10-01T09:00", end: "2026-10-31T21:00", sort: 1 },
      { allMachines: true, sns: [], start: "2026-10-01T09:00", end: "2026-10-31T21:00", sort: 1 },
    ]);
  });

  it("names each broken field by row", () => {
    const { errors, input } = validateSchedules([row(), row({ sns: [], start: "", end: "", sort: "1.5" }), row({ end: "2026-09-01T00:00" })]);
    expect(input).toBeNull();
    expect(errors).toEqual({
      "schedules.1.sns": "Choose at least one machine, or all machines.",
      "schedules.1.start": "Required.",
      "schedules.1.end": "Required.",
      "schedules.1.sort": "A whole number from 0 to 9999.",
      "schedules.2.end": "Must be after the start.",
    });
  });

  it("refuses an order outside 0 to 9999 and a blank order", () => {
    expect(validateSchedules([row({ sort: "10000" })]).errors["schedules.0.sort"]).toBeDefined();
    expect(validateSchedules([row({ sort: " " })]).errors["schedules.0.sort"]).toBeDefined();
  });

  it("round-trips the server's IST stamps into the time inputs", () => {
    expect(istInputValue("2026-10-01T09:00:00.000+05:30")).toBe("2026-10-01T09:00");
    expect(istInputValue(null)).toBe("");
    const [r] = rowsOf([schedule("2026-10-01T09:00:00.000+05:30", "2026-10-02T09:00:00.000+05:30")]);
    expect(r).toMatchObject({ id: "s", start: "2026-10-01T09:00", end: "2026-10-02T09:00", sort: "0" });
    expect(blankRow(3)).toMatchObject({ allMachines: true, sort: "3", start: "" });
  });

  it("says where an ad shows, ignoring ended rows", () => {
    const now = Date.parse("2026-10-15T12:00:00+05:30");
    const live = schedule("2026-10-01T00:00:00+05:30", "2026-10-31T00:00:00+05:30", { sns: ["SN1", "SN2"] });
    const soon = schedule("2026-11-01T00:00:00+05:30", "2026-11-30T00:00:00+05:30", { sns: ["SN2", "SN3"] });
    const past = schedule("2026-09-01T00:00:00+05:30", "2026-09-30T00:00:00+05:30", { allMachines: true, sns: [] });
    expect(whereShown({ schedules: [] }, now)).toBe("Not shown");
    expect(whereShown({ schedules: [past] }, now)).toBe("Ended");
    expect(whereShown({ schedules: [past, live, soon] }, now)).toBe("3 machines");
    expect(whereShown({ schedules: [{ ...live, allMachines: true }] }, now)).toBe("All machines");
    expect(scheduleState(live, now)).toBe("live");
    expect(scheduleState(soon, now)).toBe("upcoming");
    expect(scheduleState(past, now)).toBe("ended");
  });
});

describe("ad fields", () => {
  it("needs a name and a file", () => {
    expect(validateAdFields({ name: " ", description: "" }, null).errors).toEqual({
      name: "Required.",
      file: "Upload a picture or a video.",
    });
  });

  it("trims and sends the file by URL", () => {
    expect(validateAdFields({ name: " Offer ", description: " x " }, "https://cdn/ads/a.png").input).toEqual({
      name: "Offer",
      description: "x",
      file: { url: "https://cdn/ads/a.png" },
    });
  });

  it("caps the name at 40 characters", () => {
    expect(validateAdFields({ name: "x".repeat(41), description: "" }, "u").errors.name).toBe("Up to 40 characters.");
  });
});

describe("media checks before upload", () => {
  const picture = (name: string, type: string, size = 1000) => ({ name, type, size });

  it("takes only upright 1080×1920 ad pictures", () => {
    expect(checkMedia("ad", picture("a.png", "image/png"), { width: 1080, height: 1920 })).toBeNull();
    expect(checkMedia("ad", picture("a.png", "image/png"), { width: 1920, height: 1080 })).toBe(
      "Ad pictures must be 1080×1920 px, upright. This one is 1920×1080 px.",
    );
  });

  it("refuses BMP ads, which the machine would play as a video", () => {
    expect(checkMedia("ad", picture("a.bmp", "image/bmp"), { width: 1080, height: 1920 })).toBe("JPG, PNG or MP4 only.");
  });

  it("lets MP4 ads up to 100 MB through without reading a size", () => {
    expect(checkMedia("ad", picture("a.mp4", "video/mp4", 100 * MB), null)).toBeNull();
    expect(checkMedia("ad", picture("a.mp4", "video/mp4", 100 * MB + 1), null)).toBe("Up to 100 MB.");
    expect(checkMedia("ad", picture("a.jpg", "image/jpeg", 5 * MB + 1), null)).toBe("Up to 5 MB.");
  });

  it("takes MP3, AAC and WAV voices, by extension when the browser sends no type", () => {
    expect(checkMedia("voice", picture("hi.mp3", "audio/mpeg"), null)).toBeNull();
    expect(checkMedia("voice", picture("hi.aac", ""), null)).toBeNull();
    expect(checkMedia("voice", picture("hi.aac", "audio/x-aac"), null)).toBeNull();
    expect(checkMedia("voice", picture("hi.ogg", "audio/ogg"), null)).toBe("MP3, AAC or WAV only.");
    expect(checkMedia("voice", picture("hi.wav", "audio/wav", MB + 1), null)).toBe("Up to 1 MB.");
  });

  it("checks the logo height and the QR shape", () => {
    expect(checkMedia("logo", picture("l.png", "image/png"), { width: 600, height: 195 })).toBeNull();
    expect(checkMedia("logo", picture("l.png", "image/png"), { width: 601, height: 195 })).toMatch(/^The logo must be 195 px high/);
    expect(checkMedia("logo", picture("l.jpg", "image/jpeg"), { width: 300, height: 195 })).toBe("PNG only.");
    expect(checkMedia("qr", picture("q.png", "image/png"), { width: 200, height: 200 })).toBeNull();
    expect(checkMedia("qr", picture("q.png", "image/png"), { width: 199, height: 199 })).toMatch(/at least 200×200/);
    expect(checkMedia("qr", picture("q.png", "image/png"), { width: 300, height: 200 })).toMatch(/must be square/);
    expect(checkMedia("qr", picture("q.png", "image/png"), null)).toBe("This isn't a PNG picture.");
  });

  it("formats sizes", () => {
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.25 * MB)).toBe("3.3 MB");
  });
});

describe("app-start notice", () => {
  it("names the restart, and how many machines wait for one", () => {
    expect(appStartNotice(1)).toBe(
      "Saved. The machine picks this up the next time its app starts. 1 machine now shows Restart pending.",
    );
    expect(appStartNotice(3, "Offer deleted.")).toBe(
      "Offer deleted. The machine picks this up the next time its app starts. 3 machines now show Restart pending.",
    );
    expect(appStartNotice(0)).toBe("Saved. No machine needs a restart for this.");
  });
});

describe("QR and logo", () => {
  const file = { url: "https://cdn/qr/a.png", path: "qr/a.png", fileName: "a.png", md5: "m" };
  const base = { logo: null, memberQr: null, memberTip: "", exchangeQr: null, exchangeTip: "", memberLink: "", exchangeLink: "", instagramLink: "" };

  it("sends files by URL, trims tips and links, and keeps the stored QR pictures for old apps", () => {
    expect(
      validateQr({ ...base, logo: file, exchangeQr: file, exchangeTip: " Scan to redeem ", memberLink: " https://muscleboxpro.com/join " }).input,
    ).toEqual({
      logo: { url: file.url },
      memberQr: null,
      memberTip: "",
      exchangeQr: { url: file.url },
      exchangeTip: "Scan to redeem",
      memberLink: "https://muscleboxpro.com/join",
      exchangeLink: "",
      instagramLink: "",
    });
  });

  it("caps tips at 80 characters", () => {
    expect(validateQr({ ...base, memberTip: "x".repeat(81) }).errors).toEqual({ memberTip: "Up to 80 characters." });
  });

  it("takes only https links on muscleboxpro.com or a subdomain", () => {
    expect(linkProblem("")).toBeNull();
    expect(linkProblem("https://muscleboxpro.com/drinks")).toBeNull();
    expect(linkProblem("https://shop.muscleboxpro.com/drinks?ref=machine")).toBeNull();
    expect(linkProblem("http://muscleboxpro.com/join")).toMatch(/https/);
    expect(linkProblem("https://muscleboxpro.com.evil.in/join")).toMatch(/muscleboxpro.com/);
    expect(linkProblem("https://notmuscleboxpro.com/join")).toMatch(/muscleboxpro.com/);
    expect(linkProblem("muscleboxpro.com/join")).toMatch(/full link/);
    expect(linkProblem(`https://muscleboxpro.com/${"x".repeat(200)}`)).toBe("Up to 200 characters.");
    expect(validateQr({ ...base, exchangeLink: "http://x.in" }).input).toBeNull();
  });

  it("takes only an https Instagram profile link, and sends it trimmed", () => {
    const refused = "Use the profile link, like https://www.instagram.com/muscleboxpro/";
    expect(instagramProblem("")).toBeNull();
    expect(instagramProblem("https://www.instagram.com/muscleboxpro/")).toBeNull();
    expect(instagramProblem("https://instagram.com/mbp.andheri_1")).toBeNull();
    expect(instagramProblem("http://www.instagram.com/muscleboxpro/")).toBe(refused);
    expect(instagramProblem("https://instagram.com.evil.in/muscleboxpro/")).toBe(refused);
    expect(instagramProblem("https://muscleboxpro.com/join")).toBe(refused);
    expect(instagramProblem("https://www.instagram.com/")).toBe(refused);
    expect(instagramProblem(`https://www.instagram.com/${"a".repeat(31)}/`)).toBe(refused);
    expect(instagramProblem("instagram.com/muscleboxpro")).toBe(refused);
    expect(validateQr({ ...base, instagramLink: "https://example.com/x" }).errors).toEqual({ instagramLink: refused });
    expect(validateQr({ ...base, instagramLink: " https://www.instagram.com/mbp/ " }).input?.instagramLink).toBe("https://www.instagram.com/mbp/");
    expect(validateQr({ ...base, instagramLink: "   " }).input?.instagramLink).toBe("");
  });

  it("shows the page a scan opens, with the default when empty or refused", () => {
    expect(scanTarget("", DEFAULT_EXCHANGE_LINK)).toBe("https://muscleboxpro.com/drinks?sn=<machine SN>");
    expect(scanTarget("http://example.com/drinks", DEFAULT_EXCHANGE_LINK)).toBe("https://muscleboxpro.com/drinks?sn=<machine SN>");
    expect(scanTarget("https://muscleboxpro.com/join?ref=m", DEFAULT_MEMBER_LINK)).toBe("https://muscleboxpro.com/join?ref=m&sn=<machine SN>");
  });
});

describe("voice positions", () => {
  it("sends every position, null where empty", () => {
    const files = { ...emptyVoiceFiles(), "3": { url: "https://cdn/voice/r.mp3", path: "voice/r.mp3", fileName: "r.mp3", md5: "m" } };
    expect(toPositionsInput(files)).toEqual({ "1": null, "2": null, "3": { url: "https://cdn/voice/r.mp3" }, "4": null, "5": null });
  });
});
