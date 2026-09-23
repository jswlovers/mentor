// 서버가 시작될 때 한 번 호출된다. 무응답 자동 환불·전문가 2차 호출을 위한 주기 작업을 켠다.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSweeper } = await import("./lib/server/sweeper");
    startSweeper();
  }
}
