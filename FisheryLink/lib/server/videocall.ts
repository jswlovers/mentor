/**
 * 보이스톡/페이스톡 어댑터 — Daily.co 사용 (포레스트클럽 services/videocall.js 이식).
 * WebRTC를 직접 구현하지 않고 Daily.co의 방 생성 API만 호출한다.
 * DAILY_API_KEY가 없으면 configured:false 로 응답한다.
 */
export type CallRoom = { configured: false } | { configured: true; ok: false } | { configured: true; ok: true; url: string };

/** 통화방을 삭제해 남아 있는 참가자도 내보낸다. 실패해도 무시(요금 중단은 서버 기록이 담당). */
export async function deleteCallRoom(url: string) {
  const apiKey = process.env.DAILY_API_KEY;
  const name = url.split("/").pop();
  if (!apiKey || !name) return;
  try {
    await fetch(`https://api.daily.co/v1/rooms/${encodeURIComponent(name)}`, { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` } });
  } catch (err) {
    console.error("[videocall daily] 방 삭제 오류", err);
  }
}

export async function createCallRoom(type: "voice" | "video"): Promise<CallRoom> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) return { configured: false };
  try {
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: {
          start_video_off: type === "voice",
          start_audio_off: false,
          enable_screenshare: true,
          exp: Math.round(Date.now() / 1000) + 60 * 60, // 1시간 뒤 자동 만료
        },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.url) {
      console.error("[videocall daily] 방 생성 실패", res.status, data);
      return { configured: true, ok: false };
    }
    return { configured: true, ok: true, url: data.url };
  } catch (err) {
    console.error("[videocall daily] 요청 오류", err);
    return { configured: true, ok: false };
  }
}
