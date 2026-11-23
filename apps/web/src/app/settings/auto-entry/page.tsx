"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/api";
import {
  notificationImportApi,
  type NotificationImportItem,
} from "@/lib/notification-import-api";
import { workspaceSettingsApi } from "@/lib/workspace-settings-api";
import s from "./page.module.scss";

export default function AutoEntryPage() {
  const qc = useQueryClient();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const { data: workspace } = useQuery({
    queryKey: ["active-workspace"],
    queryFn: api.getActiveWorkspace,
  });
  const workspaceId = workspace?.id ?? "";
  const { data: devices = [] } = useQuery({
    queryKey: ["notification-import-devices", workspaceId],
    queryFn: () => notificationImportApi.devices(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["notification-imports", workspaceId],
    queryFn: () => notificationImportApi.items(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["workspace-categories", workspaceId],
    queryFn: () => workspaceSettingsApi.categories(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods", workspaceId],
    queryFn: () => api.paymentMethods(workspaceId),
    enabled: Boolean(workspaceId),
  });

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["notification-import-devices", workspaceId] }),
      qc.invalidateQueries({ queryKey: ["notification-imports", workspaceId] }),
      qc.invalidateQueries({ queryKey: ["transactions", workspaceId] }),
    ]);
  }

  async function issueDevice(form: FormData) {
    if (!workspaceId) return;
    setBusy("device");
    setError("");
    try {
      const result = await notificationImportApi.issueDevice(
        workspaceId,
        String(form.get("name")),
      );
      setToken(result.token);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "기기 토큰을 발급하지 못했습니다.");
    } finally {
      setBusy("");
    }
  }

  async function revokeDevice(id: string) {
    if (!confirm("이 Android 기기의 연결을 해제할까요?")) return;
    await notificationImportApi.revokeDevice(workspaceId, id);
    await refresh();
  }

  async function accept(item: NotificationImportItem, form: FormData) {
    setBusy(item.id);
    setError("");
    try {
      await notificationImportApi.accept(item.id, {
        workspaceId,
        title: String(form.get("title")),
        category: String(form.get("category")),
        paymentMethodId: String(form.get("paymentMethodId")) || undefined,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "거래를 등록하지 못했습니다.");
    } finally {
      setBusy("");
    }
  }

  async function ignore(id: string) {
    setBusy(id);
    try {
      await notificationImportApi.ignore(id, workspaceId);
      await refresh();
    } finally {
      setBusy("");
    }
  }

  const pending = items.filter((item) => item.status === "PENDING");
  return (
    <main className={s.page}>
      <header>
        <p>환경설정</p>
        <h1>Android 거래 자동등록</h1>
        <span>카드사 앱 알림을 분석한 뒤 확인한 거래만 가계부에 등록합니다.</span>
      </header>
      {error && <p className={s.error}>{error}</p>}
      <section className={s.card}>
        <div className={s.sectionTitle}>
          <div><h2>Android 기기 연결</h2><p>토큰은 발급 직후 한 번만 표시됩니다.</p></div>
        </div>
        <form action={issueDevice} className={s.deviceForm}>
          <Input name="name" placeholder="예: 어진 Galaxy" maxLength={100} required />
          <Button disabled={busy === "device"}>{busy === "device" ? "발급 중…" : "연결 토큰 발급"}</Button>
        </form>
        {token && (
          <div className={s.tokenBox}>
            <b>Android 앱에 아래 토큰을 입력하세요.</b>
            <code>{token}</code>
            <Button type="button" variant="ghost" onClick={() => navigator.clipboard.writeText(token)}>복사</Button>
          </div>
        )}
        <div className={s.deviceList}>
          {devices.filter((device) => !device.revokedAt).map((device) => (
            <article key={device.id}>
              <div><b>{device.name}</b><small>{device.lastSeenAt ? `마지막 수신 ${new Date(device.lastSeenAt).toLocaleString("ko-KR")}` : "아직 알림을 받지 않음"}</small></div>
              <Button variant="danger" onClick={() => revokeDevice(device.id)}>연결 해제</Button>
            </article>
          ))}
        </div>
      </section>
      <section className={s.card}>
        <div className={s.sectionTitle}>
          <div><h2>자동등록 대기함</h2><p>잘못 인식된 항목은 제외할 수 있습니다.</p></div>
          <span>{pending.length}건</span>
        </div>
        {pending.length === 0 ? <p className={s.empty}>확인할 거래가 없습니다.</p> : (
          <div className={s.importList}>
            {pending.map((item) => (
              <form key={item.id} action={(form) => accept(item, form)}>
                <div className={s.importSummary}>
                  <div><b>{item.merchant || item.sourceApp || "가맹점 미인식"}</b><small>{new Date(item.occurredAt).toLocaleString("ko-KR")} · 인식률 {Math.round(item.parserConfidence * 100)}%</small></div>
                  <strong>{item.amount === null ? "금액 미인식" : `${Number(item.amount).toLocaleString("ko-KR")}원`}</strong>
                </div>
                <div className={s.fields}>
                  <Input name="title" defaultValue={item.merchant ?? item.sourceApp ?? "카드 결제"} required />
                  <Select name="category" required defaultValue={categories[0]?.name ?? ""}>
                    {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                  </Select>
                  <Select name="paymentMethodId" defaultValue="">
                    <option value="">결제 수단 미지정</option>
                    {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
                  </Select>
                </div>
                <div className={s.actions}>
                  <Button type="button" variant="ghost" disabled={busy === item.id} onClick={() => ignore(item.id)}>제외</Button>
                  <Button disabled={busy === item.id || item.amount === null || categories.length === 0}>거래 등록</Button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
