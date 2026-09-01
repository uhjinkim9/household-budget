"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { logoutSession } from "@/lib/auth";
import s from "./LogoutButton.module.scss";

export function LogoutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function logout() {
    await logoutSession();
    sessionStorage.removeItem("verification-email");
    queryClient.clear();
    router.replace("/login");
  }

  return (
    <Button className={s.logout} variant="ghost" type="button" onClick={logout}>
      로그아웃
    </Button>
  );
}
