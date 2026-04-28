import type { UserProfile } from "../types";

interface AuthResponse {
  ok: boolean;
  user?: UserProfile | null;
  note?: string;
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  const response = await fetch("/api/auth/session", {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await response.json()) as AuthResponse;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.note || "Failed to load auth session");
  }

  return payload.user ?? null;
}

export async function registerAccount(payload: {
  email: string;
  name: string;
  password: string;
}): Promise<UserProfile> {
  return submitAuth("/api/auth/register", payload, "Registration failed");
}

export async function loginAccount(payload: {
  email: string;
  password: string;
}): Promise<UserProfile> {
  return submitAuth("/api/auth/login", payload, "Login failed");
}

export async function updateAccountProfile(
  profile: Partial<Omit<UserProfile, "isAuthenticated" | "password">>
): Promise<UserProfile> {
  return submitAuth("/api/auth/profile", profile, "Profile update failed", "PATCH");
}

export async function logoutAccount() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  }).catch(() => undefined);
}

async function submitAuth(
  url: string,
  payload: unknown,
  fallback: string,
  method = "POST"
): Promise<UserProfile> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as AuthResponse;
  if (!response.ok || !body.ok || !body.user) {
    throw new Error(body.note || fallback);
  }

  return body.user;
}
