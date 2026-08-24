"use client";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { api, type Workspace } from "@/lib/api";
import { workspaceSettingsApi } from "@/lib/workspace-settings-api";
import s from "./WorkspaceSettingsModal.module.scss";
export function WorkspaceSettingsModal({
  workspace,
  onClose,
}: {
  workspace: Workspace | null;
  onClose: () => void;
}) {
  const qc = useQueryClient(),
    [error, setError] = useState(""),
    [tab, setTab] = useState<"general" | "members" | "invites" | "categories">(
      "general",
    ),
    [inviteBusy, setInviteBusy] = useState(false),
    [copiedCode, setCopiedCode] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["workspace-settings", workspace?.id],
    queryFn: () => workspaceSettingsApi.get(workspace!.id),
    enabled: Boolean(workspace),
  });
  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ["workspace-invites", workspace?.id],
    queryFn: () => workspaceSettingsApi.invites(workspace!.id),
    enabled: Boolean(workspace),
  });
  if (!workspace) return null;
  async function refresh() {
    await qc.invalidateQueries({
      queryKey: ["workspace-settings", workspace!.id],
    });
    await qc.invalidateQueries({ queryKey: ["workspaces"] });
    await qc.invalidateQueries({ queryKey: ["active-workspace"] });
  }
  async function rename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      await api.updateWorkspace(
        workspace!.id,
        String(new FormData(e.currentTarget).get("name")),
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경하지 못했습니다.");
    }
  }
  async function removeMember(id: string, name: string) {
    if (!confirm(`${name} 구성원을 가계에서 제외할까요?`)) return;
    try {
      await workspaceSettingsApi.removeMember(workspace!.id, id);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "구성원을 제외하지 못했습니다.",
      );
    }
  }
  async function updateMemberRole(id: string, role: "MEMBER" | "VIEWER") {
    try {
      await workspaceSettingsApi.updateMemberRole(workspace!.id, id, role);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "권한을 변경하지 못했습니다.");
    }
  }
  async function addCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form);
    try {
      await workspaceSettingsApi.addCategory(workspace!.id, {
        name: String(d.get("name")),
        color: String(d.get("color")),
      });
      form.reset();
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "카테고리를 추가하지 못했습니다.",
      );
    }
  }
  async function updateCategory(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      await workspaceSettingsApi.updateCategory(workspace!.id, id, {
        name: String(d.get("name")),
        color: String(d.get("color")),
      });
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "카테고리를 변경하지 못했습니다.",
      );
    }
  }
  async function removeCategory(id: string, name: string) {
    if (
      !confirm(
        `${name} 카테고리를 삭제할까요? 기존 거래의 카테고리 표시는 유지됩니다.`,
      )
    )
      return;
    try {
      await workspaceSettingsApi.removeCategory(workspace!.id, id);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "카테고리를 삭제하지 못했습니다.",
      );
    }
  }
  async function issueInvite() {
    setInviteBusy(true);
    setError("");
    try {
      const invite = await workspaceSettingsApi.issueInvite(workspace!.id);
      await qc.invalidateQueries({
        queryKey: ["workspace-invites", workspace!.id],
      });
      await copyInvite(invite.inviteCode);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "초대 코드를 발급하지 못했습니다.",
      );
    } finally {
      setInviteBusy(false);
    }
  }
  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(""), 1800);
    } catch {
      setError("초대 코드를 복사하지 못했습니다. 직접 선택해 복사해주세요.");
    }
  }
  async function revokeInvite(id: string) {
    if (
      !confirm(
        "이 초대 코드를 비활성화할까요? 더 이상 참여에 사용할 수 없습니다.",
      )
    )
      return;
    try {
      await workspaceSettingsApi.revokeInvite(workspace!.id, id);
      await qc.invalidateQueries({
        queryKey: ["workspace-invites", workspace!.id],
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "초대 코드를 비활성화하지 못했습니다.",
      );
    }
  }
  return (
    <Modal open title={`${workspace.name} 설정`} onClose={onClose}>
      <div className={s.modal}>
        {error && <p className={s.error}>{error}</p>}
        <nav>
          <button
            className={tab === "general" ? s.active : ""}
            onClick={() => setTab("general")}
          >
            기본 설정
          </button>
          <button
            className={tab === "members" ? s.active : ""}
            onClick={() => setTab("members")}
          >
            구성원 {data?.members.length ?? 0}
          </button>
          <button
            className={tab === "invites" ? s.active : ""}
            onClick={() => setTab("invites")}
          >
            초대 코드
          </button>
          <button
            className={tab === "categories" ? s.active : ""}
            onClick={() => setTab("categories")}
          >
            소비 카테고리
          </button>
        </nav>
        {isLoading ? (
          <p className={s.empty}>설정을 불러오고 있어요…</p>
        ) : tab === "general" ? (
          <form className={s.general} onSubmit={rename}>
            <label>
              <span>가계 이름</span>
              <Input
                name="name"
                defaultValue={data?.workspace.name ?? workspace.name}
                minLength={2}
                required
              />
            </label>
            <Button>이름 변경</Button>
          </form>
        ) : tab === "members" ? (
          <div className={s.memberList}>
            {data?.members.map((member) => (
              <article key={member.id}>
                {member.profileImageUrl ? (
                  <img src={member.profileImageUrl} alt="" />
                ) : (
                  <i>{member.name.slice(0, 1)}</i>
                )}
                <div>
                  <b>{member.name}</b>
                  <small>{member.email}</small>
                </div>
                {member.role === "OWNER" ? (
                  <span>소유자</span>
                ) : (
                  <Select
                    value={member.role}
                    onChange={(event) =>
                      updateMemberRole(
                        member.id,
                        event.target.value as "MEMBER" | "VIEWER",
                      )
                    }
                    aria-label={`${member.name} 권한`}
                  >
                    <option value="MEMBER">구성원</option>
                    <option value="VIEWER">조회자</option>
                  </Select>
                )}
                {member.role !== "OWNER" && (
                  <Button
                    variant="danger"
                    onClick={() => removeMember(member.id, member.name)}
                  >
                    삭제
                  </Button>
                )}
              </article>
            ))}
          </div>
        ) : tab === "invites" ? (
          <div className={s.invites}>
            <div className={s.inviteIntro}>
              <div>
                <b>가계 초대 코드</b>
                <p>코드를 전달하면 다른 사용자가 이 가계에 참여할 수 있어요.</p>
              </div>
              <Button onClick={issueInvite} disabled={inviteBusy}>
                {inviteBusy ? "발급 중…" : "새 코드 발급"}
              </Button>
            </div>
            {invitesLoading ? (
              <p className={s.empty}>초대 코드를 불러오고 있어요…</p>
            ) : invites.length === 0 ? (
              <p className={s.empty}>발급된 초대 코드가 없습니다.</p>
            ) : (
              <div className={s.inviteList}>
                {invites.map((invite) => (
                  <article
                    key={invite.id}
                    className={!invite.isActive ? s.inactive : ""}
                  >
                    <div>
                      <code>{invite.inviteCode}</code>
                      <small>
                        {invite.isActive ? "사용 가능" : "비활성화됨"} · 사용{" "}
                        {invite.usedCount}회
                      </small>
                    </div>
                    {invite.isActive && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => copyInvite(invite.inviteCode)}
                        >
                          {copiedCode === invite.inviteCode ? "복사됨" : "복사"}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => revokeInvite(invite.id)}
                        >
                          비활성화
                        </Button>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={s.categories}>
            <form className={s.addCategory} onSubmit={addCategory}>
              <input
                type="color"
                name="color"
                defaultValue="#43836a"
                aria-label="카테고리 색상"
              />
              <Input
                name="name"
                placeholder="새 카테고리 이름"
                maxLength={50}
                required
              />
              <Button>추가</Button>
            </form>
            <div className={s.categoryList}>
              {data?.categories.map((category) => (
                <form
                  key={category.id}
                  onSubmit={(e) => updateCategory(e, category.id)}
                >
                  <input
                    type="color"
                    name="color"
                    defaultValue={category.color}
                    aria-label={`${category.name} 색상`}
                  />
                  <Input name="name" defaultValue={category.name} required />
                  <Button variant="ghost">저장</Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => removeCategory(category.id, category.name)}
                  >
                    삭제
                  </Button>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
