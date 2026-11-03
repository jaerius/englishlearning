export function InstallGuide() {
  const installed = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  return <section className="installGuide">
    <h2>iPhone에서 앱처럼 사용하기</h2>
    {installed ? <p>홈 화면에서 앱 형태로 실행 중이에요.</p> : <p>Safari에서 이 페이지를 연 뒤 <b>공유 → 홈 화면에 추가</b>를 누르세요. 아이콘을 누르면 브라우저 주소창 없이 열려요.</p>}
    <small>Apple 개발자 계정 없이 설치할 수 있어요. 잠금 화면에서 연속 녹음은 iOS 제한을 받아요.</small>
  </section>;
}
