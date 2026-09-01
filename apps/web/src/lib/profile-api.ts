import { request } from "./http";

export interface Profile {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  provider: string;
}

export const profileApi = {
  get: () => request<Profile>("/users/me"),
  update: (body: {
    name: string;
    profileImageUrl: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    request<Profile>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
