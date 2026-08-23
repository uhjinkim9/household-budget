"use client";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { profileApi, type Profile } from "@/lib/profile-api";
import s from "./page.module.scss";
export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null),
    [image, setImage] = useState<string | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    profileApi
      .get()
      .then((p) => {
        setProfile(p);
        setImage(p.profileImageUrl);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function selectImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 선택할 수 있습니다.");
      return;
    }
    setImage(await resizeAvatar(file));
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const d = new FormData(e.currentTarget),
      newPassword = String(d.get("newPassword") ?? ""),
      confirm = String(d.get("passwordConfirm") ?? "");
    if (newPassword && newPassword !== confirm) {
      setError("새 비밀번호가 서로 일치하지 않습니다.");
      setLoading(false);
      return;
    }
    try {
      const updated = await profileApi.update({
        name: String(d.get("name")),
        profileImageUrl: image,
        currentPassword: String(d.get("currentPassword") ?? "") || undefined,
        newPassword: newPassword || undefined,
      });
      setProfile(updated);
      const stored = JSON.parse(localStorage.getItem("budget-user") ?? "{}");
      localStorage.setItem(
        "budget-user",
        JSON.stringify({ ...stored, ...updated }),
      );
      window.dispatchEvent(new Event("profile-updated"));
      setMessage("프로필을 저장했습니다.");
      (
        e.currentTarget.elements.namedItem(
          "currentPassword",
        ) as HTMLInputElement
      ).value = "";
      (
        e.currentTarget.elements.namedItem("newPassword") as HTMLInputElement
      ).value = "";
      (
        e.currentTarget.elements.namedItem(
          "passwordConfirm",
        ) as HTMLInputElement
      ).value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }
  if (!profile)
    return (
      <div className={s.shell}>
        <Sidebar />
        <main className={s.state}>{error || "프로필을 불러오고 있어요…"}</main>
      </div>
    );
  return (
    <div className={s.shell}>
      <Sidebar />
      <main>
        <header>
          <p>환경설정</p>
          <h1>내 프로필</h1>
          <span>계정 정보와 프로필 이미지를 관리하세요.</span>
        </header>
        <form className={s.card} onSubmit={submit}>
          {error && <p className={s.error}>{error}</p>}
          {message && <p className={s.success}>{message}</p>}
          <section className={s.avatarSection}>
            <div className={s.avatar}>
              {image ? (
                <img src={image} alt="프로필 미리보기" />
              ) : (
                <span>{profile.name.slice(0, 1)}</span>
              )}
            </div>
            <div>
              <b>프로필 이미지</b>
              <p>
                정사각형 이미지를 권장해요. 업로드 시 자동으로 크기를 줄입니다.
              </p>
              <div className={s.imageActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  이미지 선택
                </Button>
                {image && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setImage(null)}
                  >
                    삭제
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                className={s.file}
                type="file"
                accept="image/*"
                onChange={selectImage}
              />
            </div>
          </section>
          <div className={s.divider} />
          <section className={s.fields}>
            <FormField label="이메일">
              <Input value={profile.email} disabled />
            </FormField>
            <FormField label="이름">
              <Input
                name="name"
                defaultValue={profile.name}
                minLength={2}
                required
              />
            </FormField>
          </section>
          <div className={s.divider} />
          <section>
            <h2>비밀번호 변경</h2>
            <p className={s.description}>
              변경하지 않으려면 아래 항목은 비워두세요.
            </p>
            <div className={s.fieldsCol}>
              <FormField label="현재 비밀번호">
                <Input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                />
              </FormField>
              <FormField label="새 비밀번호" hint="8자 이상 입력해주세요.">
                <Input
                  name="newPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                />
              </FormField>
              <FormField label="새 비밀번호 확인">
                <Input
                  name="passwordConfirm"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                />
              </FormField>
            </div>
          </section>
          <footer>
            <Button disabled={loading}>
              {loading ? "저장 중…" : "변경사항 저장"}
            </Button>
          </footer>
        </form>
      </main>
    </div>
  );
}
function resizeAvatar(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("이미지를 처리하지 못했습니다."));
      img.onload = () => {
        const size = 256,
          canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!,
          crop = Math.min(img.width, img.height),
          x = (img.width - crop) / 2,
          y = (img.height - crop) / 2;
        ctx.drawImage(img, x, y, crop, crop, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
