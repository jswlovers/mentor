/** 프로필 사진. 사진이 없으면 이름 첫 글자를 둥근 배경에 보여준다. */
export default function Avatar({ name, url, size = 40 }: { name: string; url: string | null | undefined; size?: number }) {
  const style = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`${name} 프로필 사진`} style={style} className="shrink-0 rounded-full border border-border bg-surface-2 object-cover" />;
  }
  return (
    <span aria-hidden style={{ ...style, fontSize: Math.round(size * 0.42) }} className="flex shrink-0 items-center justify-center rounded-full bg-rose-500/20 font-bold text-rose-300">
      {[...name.trim()][0] ?? "?"}
    </span>
  );
}
