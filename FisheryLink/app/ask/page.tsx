import { isField } from "@/lib/fisheries";
import AskForm from "./AskForm";

// /ask?field=<분야 id> 로 들어오면 그 분야를 미리 골라둔다 (분야 도감의 '이 분야 질문하기').
export default async function Ask({ searchParams }: PageProps<"/ask">) {
  const { field } = await searchParams;
  return <AskForm initialField={isField(field) ? field : ""} />;
}
