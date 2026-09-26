import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/server/db";
import { LICENSE_DIR, LICENSE_EXT, LICENSE_MAX_BYTES } from "@/lib/server/expertLicense";
import { getUser, unauthorized } from "@/lib/server/http";

const prevFile = db.prepare(`SELECT expert_license_file FROM users WHERE id = ?`);
const apply = db.prepare(
  `UPDATE users SET expert_status = 'pending', expert_bio = ?, expert_years = ?, expert_salon = ?, expert_license_no = ?, expert_license_file = ? WHERE id = ?`,
);

// 전문가 신청: 경력 연수·근무 살롱·면허번호·면허증 사진·소개(경력·자격·전문 분야)를 제출하면 관리자가 검토해 승인한다.
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) return unauthorized();
  if (user.expertStatus === "approved") return Response.json({ error: "이미 승인된 전문가예요" }, { status: 409 });
  if (user.expertStatus === "pending") return Response.json({ error: "검토 중인 신청이 있어요" }, { status: 409 });

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "신청서를 다시 작성해주세요" }, { status: 400 });
  const bio = String(form.get("bio") ?? "").trim().slice(0, 1000);
  const years = Number(form.get("years"));
  const salon = String(form.get("salon") ?? "").trim().slice(0, 60);
  const licenseNo = String(form.get("licenseNo") ?? "").trim().slice(0, 30);
  const license = form.get("license");

  if (!Number.isInteger(years) || years < 0 || years > 60) return Response.json({ error: "경력 연수를 0~60 사이 숫자로 적어주세요" }, { status: 400 });
  if (salon.length < 2) return Response.json({ error: "근무 중인(또는 최근) 살롱 이름을 적어주세요" }, { status: 400 });
  if (!(license instanceof File) || license.size === 0) return Response.json({ error: "미용사 면허증(또는 자격증) 사진을 첨부해주세요" }, { status: 400 });
  if (!LICENSE_EXT[license.type]) return Response.json({ error: "면허증은 JPG·PNG·WEBP 사진만 올릴 수 있어요" }, { status: 400 });
  if (license.size > LICENSE_MAX_BYTES) return Response.json({ error: "면허증 사진은 5MB 이하만 올릴 수 있어요" }, { status: 400 });
  if (bio.length < 20) return Response.json({ error: "경력·자격·전문 분야를 20자 이상 적어주세요" }, { status: 400 });

  fs.mkdirSync(LICENSE_DIR, { recursive: true });
  const name = `lic-${crypto.randomUUID()}${LICENSE_EXT[license.type]}`;
  fs.writeFileSync(path.join(LICENSE_DIR, name), Buffer.from(await license.arrayBuffer()));
  // 반려 후 재신청이면 이전 면허증 사진은 지운다.
  const prev = (prevFile.get(user.id) as { expert_license_file: string | null } | undefined)?.expert_license_file;
  if (prev) fs.rmSync(path.join(LICENSE_DIR, path.basename(prev)), { force: true });

  apply.run(bio, years, salon, licenseNo || null, name, user.id);
  return Response.json({ ok: true }, { status: 201 });
}
