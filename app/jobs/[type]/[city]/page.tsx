import Link from "next/link";
import { notFound } from "next/navigation";
import { CITY_DISTRICTS, JOB_TYPES, type JobType } from "@/lib/regions";

export default async function JobsByCity({ params }: { params: Promise<{ type: string; city: string }> }) {
  const { type, city: rawCity } = await params;
  // 이 Next 버전은 동적 세그먼트를 자동으로 디코드해주지 않아서 직접 decodeURIComponent 해야 한다.
  const city = decodeURIComponent(rawCity);
  if (!(type in JOB_TYPES)) notFound();
  const districts = CITY_DISTRICTS[city];
  if (!districts) notFound();
  const label = JOB_TYPES[type as JobType];

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs text-neutral-500">
        <Link href="/jobs" className="underline">구인구직</Link> · <Link href={`/jobs/${type}`} className="underline">{label}</Link>
      </p>
      <h1 className="text-lg font-bold">{label} · {city}</h1>
      <p className="text-sm text-neutral-500">지역(구/시/군)을 선택하세요.</p>
      <div className="flex flex-wrap gap-2">
        {districts.map((d) => (
          <Link key={d} href={`/jobs/${type}/${encodeURIComponent(city)}/${encodeURIComponent(d)}`} className="rounded-full border px-3 py-1.5 text-sm hover:bg-neutral-50">
            {d}
          </Link>
        ))}
      </div>
    </div>
  );
}
