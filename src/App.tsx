export function App() {
  return (
    <main className="app-canvas" aria-labelledby="app-title">
      <section className="setup-status" role="status" aria-live="polite" aria-atomic="true">
        <p className="setup-status__label">프론트엔드 기반 준비 완료</p>
        <h1 className="setup-status__title" id="app-title">
          iLove Pets
        </h1>
        <p className="setup-status__body">
          따뜻한 모바일 앱 셸이 준비되었고, 다음 단계의 반려동물 커뮤니티 화면을 안정적으로{" "}
          <span className="setup-status__body-nowrap">붙일 수 있습니다.</span>
        </p>
        <ul className="setup-status__list">
          <li>
            <span className="setup-status__item-label">React/Vite</span>
            빠른 개발 서버와 프로덕션 빌드 기반을 확인합니다.
          </li>
          <li>
            <span className="setup-status__item-label">theme tokens</span>
            DESIGN.md의 색상, 간격, 타이포그래피 계약을 사용합니다.
          </li>
          <li>
            <span className="setup-status__item-label">i18n readiness</span>
            한국어 우선 문구와 이후 다국어 확장을 위한 구조를 유지합니다.
          </li>
          <li>
            <span className="setup-status__item-label">routing readiness</span>
            실제 라우트 추가 전에도 단일 앱 셸 기준점을 제공합니다.
          </li>
        </ul>
      </section>
    </main>
  )
}
