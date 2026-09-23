import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getBalance, InsufficientCoinsError } from "@/lib/server/coins";
import { chargeAsker, claimExpert, getConsultation, isValidRoomId, roleOf } from "@/lib/server/consult";
import { DATA_DIR, db } from "@/lib/server/db";
import { forbidden, getUser, limited, unauthorized } from "@/lib/server/http";
import {
  ENTRY_MIN_COINS,
  MAX_MESSAGE_CHARS,
  MAX_ROOM_MESSAGES,
  messageCost,
} from "@/lib/server/pricing";
import { notify } from "@/lib/server/notify";
import { createCallRoom } from "@/lib/server/videocall";

const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const FILE_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
]);
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const listStmt = db.prepare(
  `SELECT id, sender_id, sender_name, body, attachment_type, attachment_url, attachment_name, created_at
   FROM messages WHERE room_id = ? AND id > ? ORDER BY id ASC`,
);
const insertStmt = db.prepare(
  `INSERT INTO messages (room_id, sender_id, sender_name, body, attachment_type, attachment_url, attachment_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
const pruneStmt = db.prepare(
  `DELETE FROM messages WHERE room_id = ? AND id NOT IN (SELECT id FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT ${MAX_ROOM_MESSAGES})`,
);

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const roomId = url.searchParams.get("roomId");
  if (!isValidRoomId(roomId)) return Response.json({ error: "방 정보를 확인해주세요" }, { status: 400 });
  const c = getConsultation(roomId);
  if (!c) return Response.json([]);
  if (roleOf(c, user) === "viewer" && !user.isAdmin) return forbidden("상담 참여자만 볼 수 있어요");
  const after = Number(url.searchParams.get("after") || 0) || 0;
  return Response.json(listStmt.all(roomId, after));
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (limited(`msg:${user.id}`, 60 * 60 * 1000, 200)) {
    return Response.json({ error: "메시지 발송이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "요청 형식이 올바르지 않아요" }, { status: 400 });
  const roomId = form.get("roomId");
  if (!isValidRoomId(roomId)) return Response.json({ error: "방 정보를 확인해주세요" }, { status: 400 });

  const consult = getConsultation(roomId);
  if (!consult) return Response.json({ error: "상담이 아직 시작되지 않았어요" }, { status: 403 });
  if (consult.status !== "open") return Response.json({ error: "종료된 상담이에요" }, { status: 409 });
  // 참여자는 질문자와 배정된 전문가뿐. 배정 전이면 승인된 전문가가 첫 메시지를 보내며 참여한다.
  const role = roleOf(consult, user);
  const willClaim = role === "viewer" && !consult.expert_id && user.isExpert;
  if (role === "viewer" && !willClaim) return forbidden("이 상담의 참여자가 아니에요");
  const billed = role === "asker"; // 과금은 질문자만

  const kind = form.get("kind") === "call" ? "call" : "message";
  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;
  let body = String(form.get("body") ?? "").trim();

  let attachmentType: string | null = null;
  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  let cost = 0;

  if (kind === "call") {
    // 통화 요청 자체는 무료. 요금은 통화 중 /api/calls/tick 으로 초당 청구된다.
    if (billed && getBalance(user.id) <= ENTRY_MIN_COINS) {
      return Response.json(
        { error: `코인이 ${ENTRY_MIN_COINS.toLocaleString()}개 이하면 통화를 시작할 수 없어요. 충전 후 다시 시도해주세요`, coins: getBalance(user.id) },
        { status: 402 },
      );
    }
    const callType = form.get("callType") === "video" ? "video" : "voice";
    const room = await createCallRoom(callType);
    if (!room.configured) return Response.json({ error: "통화 기능이 아직 설정되지 않았어요. 관리자에게 문의해주세요" }, { status: 501 });
    if (!room.ok) return Response.json({ error: "통화방을 만들지 못했어요. 잠시 후 다시 시도해주세요" }, { status: 502 });
    attachmentType = "call";
    attachmentUrl = room.url;
    attachmentName = callType;
    body = callType === "video" ? "📹 페이스톡 통화를 요청했어요" : "📞 보이스톡 통화를 요청했어요";
  } else {
    if ([...body].length > MAX_MESSAGE_CHARS) {
      return Response.json({ error: `한 메시지는 ${MAX_MESSAGE_CHARS}자 이내로 보내주세요` }, { status: 400 });
    }
    if (!body && !hasFile) return Response.json({ error: "메시지 내용을 입력해주세요" }, { status: 400 });
    if (hasFile) {
      if (file.size > MAX_FILE_BYTES) return Response.json({ error: "파일은 15MB 이하만 보낼 수 있어요" }, { status: 400 });
      if (!IMAGE_MIME.has(file.type) && !FILE_MIME.has(file.type)) {
        return Response.json({ error: "지원하지 않는 파일 형식이에요" }, { status: 400 });
      }
      if (!body) body = IMAGE_MIME.has(file.type) ? "사진을 보냈어요" : "파일을 보냈어요";
    }
    cost = billed ? messageCost(body, hasFile) : 0;
  }

  db.exec("BEGIN");
  try {
    if (willClaim) claimExpert(consult, user);
    if (cost > 0) {
      chargeAsker(getConsultation(roomId)!, cost, "message_spend", `메시지 발송 ${[...body].length}자`);
    }
    if (hasFile) {
      const ext = path.extname(file.name).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, "");
      const filename = `${crypto.randomUUID()}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));
      attachmentType = IMAGE_MIME.has(file.type) ? "image" : "file";
      attachmentUrl = `/api/messages/attachments/${filename}`;
      attachmentName = file.name;
    }
    const info = insertStmt.run(roomId, user.id, user.name, body, attachmentType, attachmentUrl, attachmentName);
    pruneStmt.run(roomId, roomId);
    db.exec("COMMIT");
    const fresh = getConsultation(roomId)!;
    notify(user.id === fresh.asker_id ? fresh.expert_id : fresh.asker_id, `${user.name}님이 메시지를 보냈어요`, `/chat/${roomId}`, { kind: "new_message", vars: { sender: user.name } });
    return Response.json({ id: Number(info.lastInsertRowid), cost, coins: getBalance(user.id) }, { status: 201 });
  } catch (err) {
    db.exec("ROLLBACK");
    if (err instanceof InsufficientCoinsError) {
      return Response.json({ error: `코인이 부족해요 (이 메시지는 ${cost.toLocaleString()}코인 필요)` }, { status: 402 });
    }
    console.error("[messages] send failed", err);
    return Response.json({ error: "메시지 전송에 실패했어요" }, { status: 500 });
  }
}
