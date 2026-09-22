"use client";
import { useCallback, useEffect, useState } from "react";

export type Me = {
  id: string;
  username: string;
  name: string;
  isAdmin: boolean;
  expertStatus: "none" | "pending" | "approved" | "rejected";
  isExpert: boolean;
  position: string | null;
  coins: number;
  earnings: number;
  unread: number;
};

// 세션 쿠키(HttpOnly)로 인증하므로 fetch가 쿠키를 자동으로 보낸다.
export async function api<T = unknown>(url: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** 현재 로그인한 회원. user === null 이면 비로그인, loading 동안은 undefined. */
export function useMe() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const refresh = useCallback(async () => {
    const r = await api<{ user: Me | null }>("/api/auth/me");
    setMe(r.ok ? r.data.user : null);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);
  return { me, refresh };
}

export const won = (n: number) => `${n.toLocaleString()}코인`;

export function timeAgo(sqliteUtc: string) {
  const t = new Date(sqliteUtc.replace(" ", "T") + "Z").getTime();
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
}

export const CATEGORIES = ["펌", "염색", "탈색", "커트", "클리닉", "매장운영", "자유게시판", "지역모임 · 서울", "지역모임 · 경기", "지역모임 · 인천", "지역모임 · 부산", "지역모임 · 대구", "지역모임 · 광주", "지역모임 · 대전", "지역모임 · 울산", "지역모임 · 세종"] as const;
