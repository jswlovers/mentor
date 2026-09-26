import { getUser, limited } from "@/lib/server/http";
import { askKnowledge, getKnowledge, listKnowledge } from "@/lib/server/colorKnowledge";

// ?id= 가 있으면 해당 항목, 없으면 학습한 자료 목록(출처별 주제)을 준다.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const answer = getKnowledge(id);
    if (!answer) return Response.json({ error: "항목을 찾을 수 없어요" }, { status: 404 });
    return Response.json({ answer });
  }
  return Response.json(listKnowledge());
}

// 학습한 컬러 이론 자료에서 질문에 맞는 답을 찾는다. 로그인 없이도 쓸 수 있다.
export async function POST(req: Request) {
  const user = getUser(req);
  const limitKey = user ? `color-ask:${user.id}` : `color-ask:ip:${req.headers.get("x-forwarded-for") ?? "local"}`;
  if (limited(limitKey, 60 * 60 * 1000, 60)) {
    return Response.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (question.length < 2) return Response.json({ error: "질문을 입력해주세요" }, { status: 400 });
  if (question.length > 300) return Response.json({ error: "질문은 300자 이내로 입력해주세요" }, { status: 400 });

  return Response.json(askKnowledge(question, user?.id ?? null));
}
