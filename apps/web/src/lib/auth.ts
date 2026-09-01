import {
  publicPost,
  removeStoredSession,
  storeSession,
  TOKEN_KEY,
  type AuthResponse,
  type SessionUser,
} from "./http";

export type { AuthResponse, SessionUser };

export interface VerificationResponse {
  email: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export function saveSession(data: AuthResponse) {
  storeSession(data);
}

export function hasSession() {
  return (
    typeof window !== "undefined" && Boolean(localStorage.getItem(TOKEN_KEY))
  );
}

export function clearSession() {
  removeStoredSession();
}

export function authenticate(path: "login", body: Record<string, string>) {
  return publicPost<AuthResponse>(`/auth/${path}`, body);
}

export function requestRegistration(body: {
  name: string;
  email: string;
  password: string;
}) {
  return publicPost<VerificationResponse>("/auth/register", body);
}

export function verifyEmail(email: string, code: string) {
  return publicPost<AuthResponse>("/auth/verify-email", { email, code });
}

export function resendVerification(email: string) {
  return publicPost<VerificationResponse>("/auth/resend-verification", {
    email,
  });
}

export async function logoutSession() {
  try {
    await publicPost<{ success: boolean }>("/auth/logout");
  } catch {
    // 서버 연결 여부와 관계없이 현재 브라우저의 로그인 정보는 제거합니다.
  } finally {
    removeStoredSession();
  }
}
