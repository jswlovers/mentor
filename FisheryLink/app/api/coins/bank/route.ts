// 무통장입금 안내 계좌. BANK_INFO(.env.local) 예: "국민은행 123456-01-234567 (예금주 홍길동)"
export async function GET() {
  return Response.json({ bank: process.env.BANK_INFO || null, tossClientKey: process.env.TOSS_CLIENT_KEY || null });
}
