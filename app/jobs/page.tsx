import Link from "next/link";
import { JOB_TYPES } from "@/lib/regions";

export default function JobsHome() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold">구인구직</h1>
      <p className="text-sm text-neutral-500">채용(구인)과 구직 중 하나를 선택하세요.</p>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(JOB_TYPES).map(([key, label]) => (
          <Link key={key} href={`/jobs/${key}`} className="rounded-xl border p-8 text-center text-lg font-semibold hover:bg-neutral-50">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
