// 전자상거래법상 사이버몰 필수 표시 사항(상호·대표자·주소·연락처·사업자등록번호·통신판매업 신고번호).
// 값은 .env.local 의 BUSINESS_* 에서 읽는다. 바꾼 뒤에는 다시 build 해야 반영된다.
const env = (k: string) => process.env[k]?.trim() || "";

export default function BusinessInfo() {
  const regNo = env("BUSINESS_REG_NO");
  const items = [
    ["상호", env("BUSINESS_NAME")],
    ["대표자", env("BUSINESS_CEO")],
    ["사업자등록번호", regNo],
    ["통신판매업 신고", env("BUSINESS_ECOMMERCE_NO")],
    ["주소", env("BUSINESS_ADDRESS")],
    ["고객센터", env("BUSINESS_PHONE")],
    ["이메일", env("BUSINESS_EMAIL")],
  ].filter(([, v]) => v);
  if (items.length === 0) return null;

  const digits = regNo.replace(/\D/g, "");
  return (
    <div className="mt-3 space-y-0.5 leading-relaxed">
      <p>
        {items.map(([k, v], i) => (
          <span key={k}>
            {i > 0 && <span className="mx-1.5 text-white/20">|</span>}
            {k} {v}
          </span>
        ))}
        {digits.length === 10 && (
          <>
            {" "}
            <a
              href={`https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${digits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/20 underline-offset-2 hover:text-foreground"
            >
              사업자정보 확인
            </a>
          </>
        )}
      </p>
    </div>
  );
}
