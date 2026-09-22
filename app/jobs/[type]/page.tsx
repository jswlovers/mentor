import Link from "next/link";
import { notFound } from "next/navigation";
import { CITIES, JOB_TYPES, type JobType } from "@/lib/regions";

export default async function JobsByType({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!(type in JOB_TYPES)) notFound();
  const label = JOB_TYPES[type as JobType];

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs text-neutral-500"><Link href="/jobs" className="underline">구인구직</Link></p>
      <h1 className="text-lg font-bold">{label}</h1>
      <p className="text-sm text-neutral-500">도시를 선택하세요.</p>
      <div className="flex flex-wrap gap-2">
        {CITIES.map((city) => (
          <Link key={city} href={`/jobs/${type}/${encodeURIComponent(city)}`} className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50">
            {city}
          </Link>
        ))}
      </div>
    </div>
  );
}
