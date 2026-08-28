"use client";

import {
  BarChart3,
  Cpu,
  FileText,
  IndianRupee,
  Megaphone,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { isPendingDeviceNo, type AdminGymView } from "@shared/admin/gyms";
import { Card, Figure, Metric, Notice, Unavailable } from "./AdminUi";
import {
  DEPOSIT_STATUS_LABEL,
  MACHINE_STATUS_LABEL,
  formatCalendarDate,
  formatInr,
  formatIstDateTime,
} from "./adminFormat";

/**
 * What the gym sees, on the admin's screen.
 *
 * ## Why this is not a second dashboard
 *
 * An admin on the phone to a partner needs to know what the partner is looking at, not a better
 * version of it. So this mirrors `GymDashboard`'s Figures tab card for card, including the cards that
 * have nothing in them, in the gym's own order. Anything richer here would answer questions the gym
 * cannot ask.
 *
 * ## Seven of the ten cards are empty, and they say why
 *
 * `GET /gym/portal` answers `sales`, `adRevenue`, `electricity` and `statements` with
 * `{available: false, reason: "not_implemented"}` — there is no ingestion from the machines and no
 * settlement job, so there are no figures anywhere to show. **Nothing here invents them.** A
 * plausible number on an admin screen is worse than a blank one: it would be quoted to a partner.
 *
 * The three that do have data (machine, deposit, agreement) come straight off `AdminGymView` rather
 * than from a second call to the portal route, which is the gym's own endpoint and would need the
 * gym's session.
 *
 * The gym's dark palette is not mirrored, only the layout. Two colour schemes in one admin panel
 * would make this section read as an embedded iframe of something else.
 */
export function AdminGymDashboard({ gym }: { gym: AdminGymView }) {
  const unit = gym.machines.find((row) => row.deviceNo === gym.machine.deviceNo) ?? null;
  const hasUnit = gym.machine.deviceNo !== null;
  const pending = hasUnit && isPendingDeviceNo(gym.machine.deviceNo);
  // The gym's own `preInstall`: before a unit is in the ground, the honest reason the figures are
  // blank is that nothing has been dispensed, not that the pipeline is missing. Both are true here,
  // and the notice below says which one the gym is being shown.
  const preInstall = !hasUnit || pending || gym.machine.installationDate === null;

  return (
    <Card
      id="dashboard"
      title="Partner dashboard"
      note="The gym's own view of its account, as the gym sees it."
      testId="card-dashboard"
    >
      <div className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Unavailable icon={BarChart3} label="Cups sold" testId="mirror-cups" />
          <Unavailable icon={IndianRupee} label="Revenue collected" testId="mirror-revenue" />
          <Unavailable icon={TrendingUp} label="Net profit" testId="mirror-profit" />
          <Unavailable icon={Wallet} label="Their payout" testId="mirror-payout" />
          <Unavailable icon={Megaphone} label="Advertising share" testId="mirror-advertising" />
          <Unavailable icon={Zap} label="Electricity reimbursement" testId="mirror-electricity" />
          <Unavailable icon={FileText} label="Monthly statements" testId="mirror-statements" />

          <Metric icon={Cpu} label="Machine" testId="mirror-machine">
            {hasUnit ? (
              <>
                <Figure
                  value={unit ? MACHINE_STATUS_LABEL[unit.status] : "Allocated"}
                  caption={
                    pending
                      ? "no physical unit chosen yet"
                      : gym.machine.installationDate
                        ? `installed ${formatCalendarDate(gym.machine.installationDate)}`
                        : "no installation date set"
                  }
                />
                <p className="mt-2 font-mono text-xs text-muted-foreground break-all">
                  {pending ? "pending" : gym.machine.deviceNo}
                </p>
              </>
            ) : (
              <Figure value="None" caption="no unit allocated" muted />
            )}
          </Metric>

          <Metric icon={ShieldCheck} label="Security deposit" testId="mirror-deposit">
            <Figure
              value={formatInr(gym.terms.securityDepositInr)}
              caption={DEPOSIT_STATUS_LABEL[gym.depositStatus].toLowerCase()}
            />
            {gym.depositWaiver && (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                Waived by {gym.depositWaiver.byEmail}
              </p>
            )}
          </Metric>

          <Metric icon={FileText} label="Agreement" testId="mirror-agreement">
            {gym.signature ? (
              <Figure
                value={`v${gym.signature.agreementVersion}`}
                caption={`signed ${formatIstDateTime(gym.signature.signedAt)}`}
              />
            ) : (
              <Figure value="Unsigned" caption="nothing to show the gym yet" muted />
            )}
          </Metric>
        </div>

        {/*
          The gym's `ReportingNotice`, in the gym's words, so an admin reading it out loud is
          reading what the partner reads.
        */}
        <div className="mt-4">
          <Notice testId="mirror-notice">
            <span className="font-semibold text-foreground">
              {preInstall
                ? "The gym is told its figures start on the day its machine is installed."
                : "The gym is told some figures are not reported yet, and that its settled statements are unaffected."}
            </span>{" "}
            There is no ingestion from the machines and no settlement job yet, so there are no
            figures to show here either. Nothing on this screen can fill these cards in.
          </Notice>
        </div>
      </div>
    </Card>
  );
}
