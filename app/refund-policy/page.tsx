import LegalPage from "../components/LegalPage";
import { AUTO_REFUND_MINUTES, CONSULT_START_FEE } from "@/lib/server/pricing";

export const metadata = { title: "환불 규정 - 미용 SOS" };

export default function RefundPolicy() {
  return (
    <LegalPage title="환불 규정">
      <h2 className="font-semibold">1. 1:1 상담 (전문가 참여 전)</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>전문가가 상담에 참여하기 전에는 질문자가 언제든 상담을 <b>취소하고 전액 환불</b>받을 수 있습니다. (상담 시작비 {CONSULT_START_FEE.toLocaleString()}코인과 그 동안 사용한 메시지 요금 전부)</li>
        <li>상담 시작 후 <b>{AUTO_REFUND_MINUTES}분</b> 안에 전문가가 참여하지 않으면 상담은 <b>자동으로 취소되고 전액 환불</b>됩니다.</li>
      </ul>
      <h2 className="font-semibold">2. 1:1 상담 (전문가 참여 후)</h2>
      <p>전문가가 참여한 뒤에는 이미 제공된 상담 서비스의 특성상 셀프 취소가 되지 않습니다. 서비스가 제대로 제공되지 않았다고 판단되면 고객센터에 <b>환불 요청</b>을 접수해주세요. 운영자가 상담 내용을 확인해 환불 여부와 금액을 결정합니다. <span className="text-muted">(세부 기준은 확정 시 명시)</span></p>
      <h2 className="font-semibold">3. 통화 요금</h2>
      <p>통화는 사용한 시간(초)만큼 차감되며, 통화 도중 연결 장애가 확인된 경우 고객센터를 통해 환불을 요청할 수 있습니다.</p>
      <h2 className="font-semibold">4. 코인 충전 취소</h2>
      <p>충전한 코인 중 사용하지 않은 잔액의 환불은 고객센터에 요청할 수 있습니다. <span className="text-muted">(환불 수수료·기간 등 세부 기준은 관계 법령 검토 후 확정)</span></p>
      <h2 className="font-semibold">5. 환불 방법</h2>
      <p>환불은 원칙적으로 회원의 코인으로 돌려드립니다. 현금·카드 결제 취소가 필요한 경우 고객센터에서 별도로 안내합니다.</p>
    </LegalPage>
  );
}
