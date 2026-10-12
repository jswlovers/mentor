"use client";
import { useState } from "react";
import { api, jsonInit } from "@/lib/client";
import Avatar from "../components/Avatar";
import type { Role, Salon } from "./types";

const ROLE_LABEL: Record<Role, string> = { owner: "원장", designer: "디자이너", intern: "인턴" };

// 직원 목록과 원장 관리(초대 코드, 직급, 내보내기, 원장 넘기기, 매장 이름·삭제). 누구나 매장에서 나갈 수 있다.
export default function Members({ salon, meId, reload }: { salon: Salon; meId: string; reload: () => void }) {
  const isOwner = salon.myRole === "owner";
  const [name, setName] = useState(salon.name);
  const [copied, setCopied] = useState(false);
  const inviteLink = salon.inviteCode && typeof window !== "undefined" ? `${window.location.origin}/salon?code=${salon.inviteCode}` : "";

  const call = async (url: string, init: RequestInit, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return false;
    const r = await api(url, init);
    if (!r.ok) { alert(r.data.error || "처리하지 못했어요"); return false; }
    reload();
    return true;
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt("초대 링크를 복사해 주세요", inviteLink);
    }
  };

  return (
    <div className="space-y-4">
      {isOwner && salon.inviteCode && (
        <section className="space-y-2 rounded-xl border border-rose-500/40 bg-rose-500/5 p-3 text-sm">
          <h2 className="font-semibold">직원 초대</h2>
          <p className="text-xs text-muted">아래 링크를 카톡으로 보내거나, 직원이 <b>내 매장</b>에서 코드를 입력하면 들어와요.</p>
          <p className="text-center font-mono text-2xl font-bold tracking-[0.3em]">{salon.inviteCode}</p>
          <div className="flex gap-2">
            <button onClick={copy} className="flex-1 rounded-lg bg-rose-500 py-2 text-sm font-medium text-white hover:bg-rose-400">{copied ? "복사했어요" : "초대 링크 복사"}</button>
            <button onClick={() => call("/api/salon", jsonInit("PATCH", { regenerateCode: true }), "새 코드를 만들면 지금 코드와 링크는 더 이상 못 써요. 바꿀까요?")}
              className="rounded-lg border border-border px-3 text-xs hover:border-white/30">코드 바꾸기</button>
          </div>
        </section>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {salon.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 p-3">
            <Avatar name={m.name} url={m.photoUrl} size={36} />
            <div className="min-w-0 flex-1 text-sm">
              <b>{m.name}</b>{m.id === meId && <span className="text-xs text-muted"> (나)</span>}
              {m.isExpert && <span className="ml-1 rounded bg-rose-500/15 px-1 text-[10px] text-rose-300">검증 전문가</span>}
              <p className="text-xs text-muted">{m.roleLabel}</p>
            </div>
            {isOwner && m.id !== meId && (
              <div className="flex shrink-0 items-center gap-2">
                <select value={m.role} aria-label={`${m.name} 직급`} className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-foreground"
                  onChange={(e) => {
                    const role = e.target.value as Role;
                    const msg = role === "owner" ? `${m.name}님에게 원장을 넘길까요? 나는 디자이너가 되고 매장 관리 권한이 넘어가요.` : undefined;
                    call(`/api/salon/members/${m.id}`, jsonInit("PATCH", { role }), msg);
                  }}>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{r === "owner" ? "원장 넘기기" : ROLE_LABEL[r]}</option>)}
                </select>
                <button onClick={() => call(`/api/salon/members/${m.id}`, { method: "DELETE" }, `${m.name}님을 매장에서 내보낼까요? ${m.name}님이 올린 작업물도 매장에서 지워져요.`)}
                  className="text-xs text-muted hover:text-rose-300">내보내기</button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <section className="space-y-2 rounded-xl border border-border bg-surface p-3 text-sm">
          <h2 className="font-semibold">매장 설정</h2>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground" />
            <button disabled={name.trim() === salon.name || name.trim().length < 2} onClick={() => call("/api/salon", jsonInit("PATCH", { name }))}
              className="rounded-lg border border-border px-3 text-xs hover:border-white/30 disabled:opacity-50">이름 바꾸기</button>
          </div>
          <button onClick={() => call("/api/salon", { method: "DELETE" }, "매장을 삭제하면 작업물·일정·공지가 모두 지워지고 직원들도 매장에서 빠져요. 정말 삭제할까요?")}
            className="text-xs text-rose-300 underline">매장 삭제</button>
        </section>
      )}

      <div className="text-center">
        <button onClick={() => call("/api/salon/leave", { method: "POST" }, isOwner && salon.members.length === 1
          ? "혼자 남은 원장이 나가면 매장이 삭제돼요. 나갈까요?"
          : "매장에서 나가면 내가 올린 작업물이 매장에서 지워져요(포트폴리오로 보낸 사진은 남아요). 나갈까요?")}
          className="text-xs text-muted underline hover:text-foreground">매장에서 나가기</button>
        {isOwner && salon.members.length > 1 && <p className="mt-1 text-[11px] text-muted">원장은 다른 직원에게 원장을 넘긴 뒤 나갈 수 있어요.</p>}
      </div>
    </div>
  );
}
