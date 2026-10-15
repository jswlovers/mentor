// href가 있는 메뉴는 서비스 허브가 아닌 별도 화면으로 연결한다.
// parent가 있는 메뉴는 상위 카테고리 안의 하위 탭으로만 보인다.
export const CAFE_SERVICES:readonly {slug:string;name:string;description:string;href?:string;parent?:string}[]=[
 {slug:'members',name:'회원·랭킹',description:'동료 프로필과 활동 랭킹'},
 {slug:'profile',name:'내 활동·등업',description:'소개·인재 검색 공개·등업 신청·즐겨찾는 게시판'},
 {slug:'resume',name:'내 이력서',description:'저장해 두고 채용공고에 바로 제출'},
 {slug:'recent',name:'최근 본 글',description:'최근 읽은 글 다시 찾기'},
 {slug:'jobs',name:'구인구직',description:'구인·구직을 지역 지도로 찾기',href:'/cafe/jobs'},
 {slug:'activity',name:'신청 관리',description:'받은 이력서·면접 대화, 교육·모델·봉사 신청'},
 {slug:'inbox',name:'문의함',description:'작성자와 주고받는 비공개 문의'},
 {slug:'market',name:'미용 쇼핑',description:'재료·도구·도서·중고 상품과 상품 문의·판매 관리'},
 {slug:'product-inbox',name:'상품 문의',description:'상품 질문과 판매자 답변',parent:'market'},
 {slug:'selling',name:'판매 관리',description:'상품 등록·가격·재고·판매 상태',parent:'market'},
 {slug:'cart',name:'장바구니',description:'수량 변경·배송지 입력·주문'},
 {slug:'orders',name:'주문·배송',description:'입금·배송·구매 확정·후기·환불'},
 {slug:'admin',name:'라운지 운영',description:'등업·노출 신청·신고 검토'},
];
export const serviceHref=(s:{slug:string;href?:string})=>s.href??`/cafe/services/${s.slug}`;
export const CAFE_ORDER_STATUS:Record<string,string>={awaiting_payment:'입금 대기',payment_submitted:'입금 확인 요청',paid:'입금 확인',shipped:'배송 중',completed:'구매 확정',cancelled:'취소',refund_requested:'환불 요청',refunded:'환불 완료'};
export const CAFE_APPLICATION_STATUS:Record<string,string>={pending:'신청 대기',accepted:'승인',rejected:'반려',cancelled:'신청 취소'};
// 채용 지원(이력서 제출) 단계
export const JOB_APPLICATION_STATUS:Record<string,string>={pending:'서류 검토 중',interview:'면접 일정 조율 중',interview_confirmed:'면접 확정',accepted:'합격',rejected:'불합격',cancelled:'지원 취소',no_show:'면접 불참'};
