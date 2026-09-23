import LegalPage from "../components/LegalPage";
import { CONSULT_START_FEE, EXPERT_SHARE } from "@/lib/server/pricing";

export const metadata = { title: "이용약관 - 미용 SOS" };

export default function Terms() {
  return (
    <LegalPage title="이용약관">
      <h2 className="font-semibold">제1조 (목적)</h2>
      <p>이 약관은 미용 SOS(이하 &quot;서비스&quot;)가 제공하는 미용 시술·매장 운영 상담 중개 서비스의 이용 조건과 절차, 회원과 운영자의 권리·의무를 정합니다.</p>
      <h2 className="font-semibold">제2조 (서비스의 성격)</h2>
      <p>서비스는 질문자와 검증된 전문가를 연결하는 <b>플랫폼</b>입니다. 전문가의 답변은 개인의 경험과 의견이며, 시술 결과나 효과를 보증하지 않습니다. 시술에 대한 최종 판단과 책임은 시술자에게 있습니다.</p>
      <h2 className="font-semibold">제3조 (회원가입)</h2>
      <p>회원은 이 약관과 개인정보 처리방침에 동의하고 아이디·이름(닉네임)·비밀번호를 입력해 가입합니다. 타인의 정보를 도용하거나 허위 정보를 입력해서는 안 됩니다.</p>
      <h2 className="font-semibold">제4조 (코인)</h2>
      <p>코인은 서비스 안에서만 사용하는 결제 수단이며 1코인은 1원에 해당합니다. 코인은 무통장입금 또는 카드 결제로 충전하며, 충전·사용·환불 내역은 회원이 코인 화면에서 확인할 수 있습니다. 환불에 관한 사항은 환불 규정을 따릅니다.</p>
      <h2 className="font-semibold">제5조 (1:1 상담 요금)</h2>
      <p>1:1 상담을 신청하는 질문자는 상담 시작비 {CONSULT_START_FEE.toLocaleString()}코인을 지급하며, 이후 채팅 메시지와 통화 이용 시간에 따라 요금이 차감됩니다. 세부 요금은 코인 화면의 요금 안내를 따릅니다. 전문가는 상담 참여 시 요금을 지급하지 않습니다.</p>
      <h2 className="font-semibold">제6조 (전문가와 수익 정산)</h2>
      <p>전문가로 승인된 회원은 질문자가 지급한 상담 요금의 {Math.round(EXPERT_SHARE * 100)}%를 수익으로 정산받고, 나머지는 서비스 이용 수수료로 운영자에게 귀속됩니다. 출금은 운영자가 정한 최소 금액 이상으로 신청할 수 있으며, 관련 세금(사업소득 원천징수 등)은 관계 법령에 따릅니다.</p>
      <h2 className="font-semibold">제7조 (금지 행위)</h2>
      <p>고객의 개인정보(얼굴·이름·연락처 등) 게시, 욕설·비방·허위 정보, 서비스 밖 금전 거래 유도, 타인 계정 도용, 서비스 운영 방해 행위를 금지합니다. 같은 회원에 대한 신고가 일정 수 이상 누적되면 이용이 자동으로 정지될 수 있습니다.</p>
      <h2 className="font-semibold">제8조 (이용 제한)</h2>
      <p>운영자는 약관을 위반한 회원에 대해 경고, 이용 정지 등 조치를 할 수 있으며 회원은 고객센터를 통해 이의를 제기할 수 있습니다.</p>
      <h2 className="font-semibold">제9조 (면책)</h2>
      <p>운영자는 회원 간 상담 내용의 정확성이나 시술 결과에 대해 책임지지 않습니다. 천재지변, 통신·외부 서비스(통화, 결제 등) 장애로 인한 서비스 중단에 대해서는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.</p>
      <h2 className="font-semibold">제10조 (약관의 변경)</h2>
      <p>약관을 변경하는 경우 시행 전에 서비스 안에서 공지합니다.</p>
    </LegalPage>
  );
}
