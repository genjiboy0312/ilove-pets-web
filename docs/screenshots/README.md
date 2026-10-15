# 화면 캡처

2026-10-15 UI를 기준으로 한 README용 화면입니다. 기존 페이지는 배포본 `2100a43`에서 캡처했으며, 홈과 비로그인 내 계정은 이후 로그인 진입·카테고리 변경의 production 미리보기 빌드에서 갱신했습니다. viewport는 375 × 812px이며 Playwright Chromium으로 캡처했습니다.

기존 UI 검사에서 촬영한 PNG를 보관하고, 내 계정·성장 기록·활동 알림·자료 이전 미리보기를 추가 촬영했습니다. 공개 배포본의 계정 화면은 Supabase 요청을 테스트 fixture로 대체했고, 갱신한 홈·비로그인 화면은 로컬 production 미리보기의 로그아웃 상태와 샘플 피드를 사용합니다. 테스트 계정·샘플 펫을 사용하며 실제 이용자 개인정보와 비공개 사진은 포함하지 않습니다. 일부 사진은 테스트 색상 이미지 또는 로딩 실패 시 대체 화면입니다. 서버 동작 검증의 증거와 화면 예시는 구분합니다.

이미지를 합성하거나 UI를 이미지 편집으로 변경하지 않았습니다. 파일은 저장소에 포함되어 GitHub README에서도 상대 경로로 표시됩니다.

비로그인 내 계정의 두 캡처는 발바닥 아이콘을 동물 가족 일러스트로 교체한 빌드에서 다시 촬영했습니다. 화면 안의 일러스트는 AI 생성 에셋이며, [원본과 생성 정보](../../assets/README.md)를 보관합니다. 캡처에는 실제 앱이 렌더링한 이미지를 그대로 사용했습니다.

`operations-*`는 실제 서버 적용 전인 S5 작업본의 production 미리보기에서 모의 API로 캡처했습니다. 실제 계정을 삭제하거나 신고한 결과가 아닙니다.

| 이미지                                                     | 화면 및 사용 흐름                                       |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| [home.png](home.png)                                       | 홈 카테고리·스토리·피드                                 |
| [explore.png](explore.png)                                 | 인기 펫 가로 목록과 사진 그리드                         |
| [account.png](account.png)                                 | 로그인 프로필·작성·자료 가져오기                        |
| [account-guest.png](account-guest.png)                     | 비로그인 안내와 선택적 기기 기록 진입                   |
| [account-guest-dark.png](account-guest-dark.png)           | 비로그인 내 계정 다크 모드                              |
| [create.png](create.png)                                   | 사진 일기 작성                                          |
| [community.png](community.png)                             | 샘플 게시판·카테고리                                    |
| [auth.png](auth.png)                                       | Google·이메일 로그인 UI                                 |
| [growth.png](growth.png)                                   | 샘플 펫의 성장 그래프·케어 기록 팝업                    |
| [activity.png](activity.png)                               | 모의 좋아요·팔로우 알림과 읽음 상태                     |
| [import-preview.png](import-preview.png)                   | 테스트 백업의 펫·글·성장 기록·사진 각 1개 이전 미리보기 |
| [import.png](import.png)                                   | 자료 이전 초기 화면                                     |
| [cloud.png](cloud.png)                                     | 계정 전용 클라우드 기록 관리                            |
| [profile.png](profile.png)                                 | 공개 프로필                                             |
| [post.png](post.png)                                       | 공개 게시물 상세                                        |
| [settings.png](settings.png)                               | 설정 그룹·테마·언어                                     |
| [home-dark.png](home-dark.png)                             | 다크 모드 홈                                            |
| [settings-dark.png](settings-dark.png)                     | 다크 모드 설정                                          |
| [operations-deletion.png](operations-deletion.png)         | S5 삭제 확인·백업·최근 로그인 안내                      |
| [operations-report-block.png](operations-report-block.png) | S5 모의 신고 접수와 차단 확인                           |

[프로젝트 설명으로 돌아가기](../../README.md)
