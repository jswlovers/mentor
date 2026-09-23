import LegalPage from "../components/LegalPage";

export const metadata = { title: "개인정보 처리방침 - 미용 SOS" };

export default function Privacy() {
  return (
    <LegalPage title="개인정보 처리방침">
      <h2 className="font-semibold">1. 수집하는 개인정보와 목적</h2>
      <table className="w-full border-collapse text-xs">
        <thead><tr className="bg-surface-2"><th className="border border-border p-1.5 text-left">항목</th><th className="border border-border p-1.5 text-left">목적</th><th className="border border-border p-1.5 text-left">시점</th></tr></thead>
        <tbody>
          <tr><td className="border border-border p-1.5">아이디, 이름(닉네임), 비밀번호(암호화 저장)</td><td className="border border-border p-1.5">회원 식별, 로그인</td><td className="border border-border p-1.5">가입</td></tr>
          <tr><td className="border border-border p-1.5">휴대폰 번호</td><td className="border border-border p-1.5">본인 확인, 카카오톡·문자 알림 발송 (선택)</td><td className="border border-border p-1.5">휴대폰 인증 시</td></tr>
          <tr><td className="border border-border p-1.5">질문·답변·상담 대화·첨부(사진·파일)</td><td className="border border-border p-1.5">서비스 제공, 분쟁 해결</td><td className="border border-border p-1.5">이용 중</td></tr>
          <tr><td className="border border-border p-1.5">코인 충전·사용·환불 내역, 입금자명</td><td className="border border-border p-1.5">결제·정산·환불 처리</td><td className="border border-border p-1.5">충전·이용 시</td></tr>
          <tr><td className="border border-border p-1.5">전문가 소개(경력·자격), 계좌 정보</td><td className="border border-border p-1.5">전문가 승인, 수익 지급</td><td className="border border-border p-1.5">전문가 신청·출금 신청 시</td></tr>
          <tr><td className="border border-border p-1.5">접속 기록, 서비스 이용 기록</td><td className="border border-border p-1.5">보안, 부정 이용 방지</td><td className="border border-border p-1.5">이용 중</td></tr>
        </tbody>
      </table>
      <h2 className="font-semibold">2. 보유·이용 기간</h2>
      <p>회원 탈퇴 또는 목적 달성 시까지 보유하며, 관계 법령에서 정한 기간(전자상거래 등에서의 소비자보호에 관한 법률에 따른 계약·결제 기록 등)은 해당 기간 동안 보관합니다. 구체적인 기간은 확정 시 명시합니다.</p>
      <h2 className="font-semibold">3. 제3자 제공·처리 위탁</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>통화 제공: Daily.co (음성·영상 통화 연결)</li>
        <li>알림·인증번호 발송: Solapi 및 카카오 (휴대폰 번호, 알림 문구) — 알림 수신에 동의한 경우</li>
        <li>카드 결제: 토스페이먼츠 — 카드 결제를 이용하는 경우</li>
      </ul>
      <h2 className="font-semibold">4. 이용자의 권리</h2>
      <p>회원은 언제든지 내 정보에서 휴대폰 번호 삭제와 알림 수신 동의 철회를 할 수 있고, 고객센터를 통해 개인정보 열람·정정·삭제를 요청할 수 있습니다.</p>
      <h2 className="font-semibold">5. 질문 사진과 상담 대화</h2>
      <p>질문에 첨부한 사진은 질문과 함께 <b>공개</b>됩니다. 고객의 얼굴·이름·연락처 등 개인정보가 포함되지 않도록 주의해야 합니다. 1:1 상담 대화와 첨부는 상담 참여자와 운영자만 열람할 수 있습니다.</p>
      <h2 className="font-semibold">6. 안전성 확보 조치</h2>
      <p>비밀번호는 복원할 수 없는 방식으로 암호화해 저장하며, 접속은 HTTPS로 암호화합니다. 관리자 권한은 최소한으로 부여합니다.</p>
      <h2 className="font-semibold">7. 문의</h2>
      <p>개인정보 관련 문의는 서비스의 고객센터로 접수해주세요. (개인정보 보호책임자 정보는 확정 시 기재)</p>
    </LegalPage>
  );
}
