// 약관류 페이지 공통 레이아웃. 문안은 초안이며 공개 전 법률 검토·확정이 필요하다(docs/feature-roadmap.md 4장 D).
export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-3 px-6 py-8 text-sm leading-relaxed text-foreground/90">
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
      <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">※ 이 문서는 <b>초안</b>입니다. 서비스 정식 공개 전에 법률 전문가의 검토를 거쳐 확정합니다. (시행 예정일: 확정 후 공지)</p>
      {children}
    </article>
  );
}
