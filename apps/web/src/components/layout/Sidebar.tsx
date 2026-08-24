"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select } from "@/components/ui/Select";
import { api, type Workspace } from "@/lib/api";
import s from "./Sidebar.module.scss";
interface StoredUser {
  name: string;
  profileImageUrl?: string | null;
}
export function Sidebar() {
  const pathname = usePathname(),
    queryClient = useQueryClient(),
    [user, setUser] = useState<StoredUser>({ name: "사용자" });
  const { data: active } = useQuery({
    queryKey: ["active-workspace"],
    queryFn: api.getOrCreateWorkspace,
  });
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: api.listWorkspaces,
    enabled: Boolean(active),
  });
  useEffect(() => {
    const load = () => {
      try {
        const value = localStorage.getItem("budget-user");
        if (value) setUser(JSON.parse(value));
      } catch {}
    };
    load();
    window.addEventListener("profile-updated", load);
    return () => window.removeEventListener("profile-updated", load);
  }, []);
  function changeWorkspace(id: string) {
    const next = workspaces.find((x) => x.id === id);
    if (!next) return;
    api.setActiveWorkspace(id);
    queryClient.setQueryData<Workspace>(["active-workspace"], next);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
  }
  return (
    <aside className={s.sidebar}>
      <div className={s.workspaceSwitcher}>
        <Link href="/home" className={s.logo} aria-label="대시보드로 이동">
          <img src="/icon.svg" alt="Mercury Lab" />
        </Link>
        <Select
          width="100%"
          tone="dark"
          value={active?.id ?? ""}
          onValueChange={changeWorkspace}
          options={workspaces.map((workspace) => ({
            value: workspace.id,
            label: workspace.name,
            description: "가계로 이동",
          }))}
          placeholder="가계 선택"
          aria-label="가계 선택"
        />
      </div>
      <nav>
        {active?.role !== "VIEWER" && (
          <Link href="/home" className={pathname === "/home" ? s.active : ""}>
            ⌂<span>대시보드</span>
          </Link>
        )}
        <Link
          href="/transactions?type=SPENDING"
          className={pathname === "/transactions" ? s.active : ""}
        >
          ▤<span>거래 내역</span>
        </Link>
        {active?.role !== "VIEWER" && (
          <Link
            href="/reports"
            className={pathname === "/reports" ? s.active : ""}
          >
            ◕<span>지출 리포트</span>
          </Link>
        )}
        {active?.role === "OWNER" && (
          <>
            <Link
              href="/payment-methods"
              className={pathname === "/payment-methods" ? s.active : ""}
            >
              ▣<span>결제 수단</span>
            </Link>
            <Link
              href="/members"
              className={pathname === "/members" ? s.active : ""}
            >
              ♧<span>가계 구성원</span>
            </Link>
          </>
        )}
      </nav>
      <div className={s.bottom}>
        <Link href="/settings" className={s.user}>
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="프로필" />
          ) : (
            <i>{user.name.slice(0, 1)}</i>
          )}
          <div>
            <b>{user.name}</b>
            <small>
              {active?.role === "OWNER"
                ? "가계 관리자"
                : active?.role === "VIEWER"
                  ? "조회자"
                  : "구성원"}
            </small>
          </div>
          <span className={s.settingsIcon} aria-hidden="true">
            ⚙
          </span>
        </Link>
      </div>
    </aside>
  );
}
