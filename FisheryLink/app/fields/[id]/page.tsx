import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_FIELDS, findField } from "@/lib/fisheries";
import FieldQuestions from "./FieldQuestions";

export function generateStaticParams() {
  return ALL_FIELDS.map((f) => ({ id: f.id }));
}

export default async function FieldDetail({ params }: PageProps<"/fields/[id]">) {
  const { id } = await params;
  const f = findField(id);
  if (!f) notFound();
  const siblings = f.group.items.filter((i) => i.id !== f.id);

  return (
    <div className="space-y-4 p-4">
      <div>
        <Link href={`/fields#${f.group.id}`} className="text-xs text-blue-700">{f.group.icon} {f.group.name}</Link>
        <h1 className="mt-1 text-xl font-bold">{f.name} {f.alias && <span className="text-sm font-normal text-neutral-500">{f.alias}</span>}</h1>
        <p className="mt-2 text-sm">{f.desc}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg bg-neutral-50 p-3 text-sm">
        <dt className="text-neutral-500">주산지</dt><dd>{f.regions}</dd>
        <dt className="text-neutral-500">방식</dt><dd>{f.method}</dd>
      </dl>
      <section>
        <h2 className="mb-2 text-sm font-semibold">조합원이 자주 묻는 주제</h2>
        <div className="flex flex-wrap gap-1.5">
          {f.topics.map((t) => <span key={t} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800">{t}</span>)}
        </div>
      </section>
      <Link href={`/ask?field=${f.id}`} className="block rounded-lg bg-blue-600 py-3 text-center font-medium text-white">{f.name} 분야 질문하기 (무료)</Link>
      <FieldQuestions field={f.id} />
      {siblings.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">같은 분야의 다른 품목</h2>
          <div className="flex flex-wrap gap-1.5">
            {siblings.map((s) => <Link key={s.id} href={`/fields/${s.id}`} className="rounded-full border px-2.5 py-1 text-xs">{s.name}</Link>)}
          </div>
        </section>
      )}
    </div>
  );
}
