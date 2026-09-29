"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAd, deleteAd, fetchAds } from "@/lib/adminMachineApi";
import type { Ad } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { SuccessPanel } from "./AdminUi";
import { AdForm, AdPreview, mediaOfAd } from "./machines/AdForm";
import { whereShown } from "./machines/adRules";
import { APP_START_NOTE, appStartNotice, formatBytes } from "./machines/mediaBits";
import {
  Cell,
  Col,
  ConfirmDialog,
  DataTable,
  FilterBar,
  formatIstStamp,
  Head,
  MachineDialog,
  MachinesHeader,
  NoData,
  Pager,
  problemOf,
  ProblemPanel,
  TextFilter,
  type Problem,
} from "./machines/MachinesUi";

export default function AdminMachineAds() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <Ads session={guard.session} />;
}

function Ads({ session }: { session: AdminSession }) {
  const router = useRouter();
  const [draftName, setDraftName] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<Ad[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Ad | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAds(name, page, pageSize);
    setLoading(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setRows(result.data.items);
    setTotal(result.data.total);
  }, [name, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteAd(deleting.adId);
    setBusy(false);
    const ad = deleting;
    setDeleting(null);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setNotice(ad.schedules.length > 0 ? appStartNotice(result.data.restartPending, `${ad.name} deleted.`) : `${ad.name} deleted.`);
    await load();
  }

  const now = Date.now();

  return (
    <MachinesShell session={session} section="ads">
      <MachinesHeader
        title="Ads"
        subtitle="Full-screen ads a machine plays after 3 minutes idle on the menu. They play only if the machine's own Play ads switch is on."
        action={
          <Button
            type="button"
            onClick={() => {
              setNotice(null);
              setAdding(true);
            }}
            className="rounded-xl cursor-pointer"
            data-testid="button-add-ad"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add ad
          </Button>
        }
      />

      <ProblemPanel problem={problem} testId="ads-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="ads-notice">{notice}</SuccessPanel>
        </div>
      )}

      <FilterBar
        onSearch={() => {
          setPage(1);
          setName(draftName.trim());
        }}
        onReset={() => {
          setDraftName("");
          setName("");
          setPage(1);
        }}
      >
        <TextFilter label="Name or number" value={draftName} onChange={setDraftName} testId="filter-ad-name" />
      </FilterBar>

      <DataTable testId="ads-table">
        <Head>
          <Col>Preview</Col>
          <Col>Name</Col>
          <Col>Type</Col>
          <Col align="right">Size</Col>
          <Col>Where shown</Col>
          <Col>Updated</Col>
          <Col>Operate</Col>
        </Head>
        <tbody className="divide-y divide-border/70">
          {rows.length === 0 ? (
            <NoData colSpan={7} loading={loading} />
          ) : (
            rows.map((ad) => (
              <tr key={ad.adId} className="hover:bg-secondary/40 transition-colors" data-testid={`row-ad-${ad.adId}`}>
                <Cell>
                  <AdPreview media={mediaOfAd(ad)} width={40} />
                </Cell>
                <Cell className="min-w-[10rem]">
                  <Link href={`/machines/ads/${encodeURIComponent(ad.adId)}`} className="font-semibold text-foreground hover:text-primary">
                    {ad.name}
                  </Link>
                  <span className="block font-mono text-[11px] text-muted-foreground">{ad.no}</span>
                </Cell>
                <Cell className="text-muted-foreground">{ad.type === "video" ? "Video" : "Image"}</Cell>
                <Cell align="right" className="whitespace-nowrap tabular-nums text-muted-foreground">
                  {formatBytes(ad.file.size)}
                </Cell>
                <Cell className="whitespace-nowrap"><span data-testid={`where-${ad.adId}`}>{whereShown(ad, now)}</span></Cell>
                <Cell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatIstStamp(ad.updatedAt)}
                  {ad.updatedBy && <span className="block">{ad.updatedBy}</span>}
                </Cell>
                <Cell>
                  <span className="flex gap-3 whitespace-nowrap">
                    <Link
                      href={`/machines/ads/${encodeURIComponent(ad.adId)}`}
                      className="text-xs font-semibold text-primary hover:underline"
                      data-testid={`edit-ad-${ad.adId}`}
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/machines/ads/${encodeURIComponent(ad.adId)}#where-shown`}
                      className="text-xs font-semibold text-primary hover:underline"
                      data-testid={`where-shown-${ad.adId}`}
                    >
                      Where shown
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setDeleting(ad);
                      }}
                      className="text-xs font-semibold text-rose-300 hover:underline cursor-pointer"
                      data-testid={`delete-ad-${ad.adId}`}
                    >
                      Delete
                    </button>
                  </span>
                </Cell>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      <Pager
        total={total}
        page={page}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {adding && (
        <MachineDialog open onClose={() => setAdding(false)} title="Add ad" wide testId="add-ad-dialog">
          <AdForm
            ad={null}
            submitLabel="Add and choose where it shows"
            onSubmit={createAd}
            onCancel={() => setAdding(false)}
            onSaved={(ad) => router.push(`/machines/ads/${encodeURIComponent(ad.adId)}#where-shown`)}
          />
        </MachineDialog>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `Delete ${deleting.name}?` : "Delete ad"}
        message={
          deleting && deleting.schedules.length > 0
            ? `It is set to show on machines. Deleting it stops that. ${APP_START_NOTE}`
            : "It isn't shown on any machine."
        }
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
        testId="delete-ad"
      />
    </MachinesShell>
  );
}
