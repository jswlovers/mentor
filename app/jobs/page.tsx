import { redirect } from "next/navigation";

// 예전 구인구직 주소는 라운지 구인구직으로 옮겼다.
export default async function LegacyJobs() {
  redirect("/cafe/jobs");
}
