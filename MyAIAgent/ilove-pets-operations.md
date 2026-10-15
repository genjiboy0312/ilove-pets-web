# S5 운영 준비와 적용 안내

업데이트: 2026-10-15 (Asia/Seoul)

## 현재 상태

S5 코드와 격리 검증을 준비했다. **실제 Supabase 마이그레이션·함수 배포·예약 실행·전체 계정/사진 백업은 아직 실행하지 않았다.** 자동 승인 검토가 공유 서비스와 민감 데이터에 대한 대상·범위 승인을 요구했다. 기존 공개 배포본에는 S5가 반영되지 않았다.

S1의 운영 SMTP/메일 실수신, 실제 휴대전화의 계정 간 시나리오, 별도 Supabase 프로젝트에서의 원격 복원 실습은 외부 확인 항목이다. 이를 코드 구현 또는 모의 테스트 통과와 같은 의미로 기록하지 않는다.

## 제공하는 동작

| 기능 | 동작 | 경계 |
| --- | --- | --- |
| 계정 삭제 | 설정 → 계정 삭제 → 백업/안내 → 체크 + DELETE 입력 → 요청 | 최근 10분 내 실제 로그인 AMR, Auth 검증, 본인 계정만 |
| 삭제 처리 | 즉시 deleting 상태로 접근 차단 → 사진 정리 → Auth 삭제 | 최소 15분 유예, 실패 재시도, 원본 기기 자료 유지 |
| 자동 정리 | 만료 스토리, 오래된 예약/참조 없는 사진, 삭제 큐 | 15분 주기, 이미지 2개 객체 제거 확인 전 용량 반환 금지 |
| 처리 중 사진 | 짧은 업로드 예약 만료만으로 정리하지 않음 | 처리 만료 후 24시간 격리. 삭제 시작 후 ready 전환 차단 |
| 신고 | 공개 프로필·글·댓글과 볼 수 있는 스토리에서 접수 | 본인 대상 금지, 같은 대상 중복 방지, 계정당 하루 20건, 초과 HTTP 429 |
| 차단 | 상호 팔로우 해제와 로그인 상태의 조회/상호작용 제한 | 공개 자료는 로그아웃/다른 계정에서 보일 수 있음 |
| 신고 대응 | 운영자 CLI로 조회·검토·숨김·기각 | 브라우저 역할은 운영 테이블/RPC에 접근 불가. 신고만으로 자동 숨기지 않음 |
| 사용자 백업 | 삭제 안내에서 펫·게시물·성장·게시물 표시 사진 JSON 다운로드 | 기존 기기 백업 형식으로 복원 가능. 프로필·스토리·소셜 댓글·팔로우는 제외 |
| 운영 백업 | 앱 DB + Auth 사용자/identity + 사진을 로컬 AES-256-GCM 암호화 | 키는 별도 보관, 토큰/키/원문을 Git이나 콘솔에 출력하지 않음 |
| 화면 로딩 | 페이지별 지연 로딩과 실패 시 홈/재시도 안내 | 아직 방문하지 않은 화면은 오프라인 캐시가 없을 수 있음 |

### 삭제의 보장과 제한

- 삭제 요청은 사용자의 입력값으로 owner를 지정하지 않는다. 서버가 검증한 사용자 ID를 사용한다.
- JWT 갱신 시각은 재인증으로 간주하지 않는다. 실제 `password`/`oauth`/`otp`/`totp` AMR 시각을 검사한다.
- 첫 프로필 생성 이전에 요청해도 deleting 프로필을 먼저 보장하므로 `ensure_profile`로 되살릴 수 없다.
- 사진 처리 완료 시 프로필에 공유 잠금을 걸어 삭제 전환과 직렬화한다. 삭제 시작 후 이미지가 ready로 게시되지 않는다.
- 미디어는 물리 삭제 확인 전까지 비용을 유지한다. 작업 임대 토큰이 다른 오래된 콜백은 완료 처리할 수 없다.
- Auth 삭제 전 `pet-media`의 해당 owner 경로를 확인한다. 예상하지 못한 경로나 남은 객체가 있으면 삭제를 보류하고 실패 상태를 남긴다.
- 계정 삭제 job과 사진 큐는 Auth FK cascade에 의존하지 않으며, Auth 삭제 응답이 이미 삭제됨(404)인 경우 재시도도 완료할 수 있다.
- 계정 삭제는 취소 가능한 휴지통 기능이 아니다. 다른 Storage 버킷을 추가하면 해당 버킷의 소유 객체 정리도 확장해야 한다.

## 실제 프로젝트 적용 순서

대상은 기존 `ilove-pets-dev` 프로젝트, public URL은 `https://rdpfrblrzqphhievlihq.supabase.co`다. 기존 사용자 계정을 테스트 목적으로 삭제하지 않는다. 아래 절차는 승인을 받은 뒤 실행한다.

1. 기존 CLI 로그인과 `.env.local`의 공개 프로젝트 URL을 확인한다. 비밀 키를 채팅 또는 VITE 환경변수에 넣지 않는다.
2. `node scripts/cloud-backup.mjs create`로 변경 전 백업을 만든다. S5 테이블이 없는 S4 스키마도 지원한다. 미완료 백업에는 정상 manifest를 만들지 않는다.
3. 기존 7개 마이그레이션 이후 `202610150007_operations.sql`을 한 번 적용한다. 이 SQL은 반복 실행용이 아니다.
4. 두 Edge 함수를 배포한다.
5. 준비된 상태에서 `node scripts/configure-operations.mjs`를 실행한다. 임의의 maintenance 전용 토큰을 Edge Secret과 Vault에 설정하고 pg_cron/pg_net을 구성한다.
6. 예약 호출·작업 기록·임시 A/B/익명 검증을 확인한다. 초기화나 전체 테이블 삭제로 검사하지 않는다.
7. 서버 준비가 확인된 뒤 프런트엔드를 main에 반영하고 공개 주소에서 재검증한다.

```bash
npx supabase db query --linked --project-ref YOUR_PROJECT_REF --file supabase/migrations/202610150007_operations.sql
npx supabase functions deploy account-operations --project-ref YOUR_PROJECT_REF --use-api
npx supabase functions deploy maintenance --project-ref YOUR_PROJECT_REF --use-api
node scripts/configure-operations.mjs
node scripts/operations.mjs health
```

예약은 서버 DB에서 실행하므로 개발 PC나 앱 방문에 의존하지 않는다. 이 프로젝트의 cron은 15분 간격이며 과금·사용량 무제한을 의미하지 않는다. [Supabase 함수 예약 안내](https://supabase.com/docs/guides/functions/schedule-functions).

### 예약 실행과 비밀 경계

`MAINTENANCE_SECRET`은 maintenance 전용 토큰이다. 브라우저에 배포하지 않으며 service-role 키 대신 이 토큰을 cron에 사용한다. cron 명령에는 비밀 값 대신 `app_private.run_scheduled_maintenance()`만 저장한다. Vault 조회와 pg_net 큐에는 브라우저 DB 역할이 접근하지 못하도록 권한을 제한한다. 구성 스크립트의 임시 파일은 실행 후 삭제하며 비밀 값이 섞인 CLI 원문 오류도 출력하지 않는다. Vault 보관 방식은 [공식 Vault 문서](https://supabase.com/docs/guides/database/vault)를 참고한다.

처리 중 사진의 24시간 격리는 호스팅된 Edge 런타임을 전제로 한 보수적 기준이다. 자체 호스팅에서 실행 제한을 바꾸면 별도 검토가 필요하다. [호스팅 함수 실행 제한](https://supabase.com/docs/guides/functions/limits).

## 신고 대응과 운영 확인

```bash
node scripts/operations.mjs health
node scripts/operations.mjs reports
node scripts/operations.mjs report REPORT_UUID view
node scripts/operations.mjs report REPORT_UUID hide
node scripts/operations.mjs report REPORT_UUID dismiss
```

상태 확인은 정리 실패·계정 삭제 실패·최근 실행 실패 또는 1시간 이상 실행 없음에 비정상 종료 코드로 응답한다. 신고 목록/본문은 운영자 로컬 콘솔용이며 공개 로그에 게시하지 않는다. 외부 이메일·메신저로 보내는 자동 경보는 연결하지 않았다.

운영 기록은 30일, 완료된 정리·삭제 작업과 해결된 신고는 90일 후 정리한다. 미해결 신고는 검토할 때까지 유지한다. 운영 문의처·보관 정책과 실제 담당자는 공개 운영 전에 확정해야 한다. 앱의 개인정보 안내에서 로컬과 클라우드를 구분하지만 법률 검토가 완료된 운영 문서라고 주장하지 않는다.

## 백업과 복원

### 사용자가 자신의 기록을 보관할 때

설정의 계정 삭제 안내에 있는 `내 클라우드 기록 백업`을 사용한다. 내려받은 JSON은 내 계정의 기기 기록 → 백업 복원에서 사용할 수 있다. 복원은 기기 자료 전체 교체이므로 기존 기기 자료도 먼저 백업한다. 운영자용 암호화 파일과 사용자 JSON은 서로 다른 형식이다.

### 운영자가 프로젝트를 보관할 때

```bash
node scripts/cloud-backup.mjs create
node scripts/cloud-backup.mjs verify .backups/BACKUP_DIRECTORY
```

`.backups/`는 Git에서 제외한다. `recovery.key`를 별도 안전한 위치에 보관하고 백업 파일과 함께 공개하지 않는다. 사용자 데이터와 Auth 사용자/identity, 비밀번호 해시를 포함하는 민감한 백업이다. 활성 로그인 세션·refresh token 테이블·SMTP/OAuth 설정·프로젝트 비밀은 복제하지 않는다. MFA가 등록된 프로젝트는 이 경량 포트폴리오 백업을 중단하고 별도의 전체 플랫폼 복구 절차를 사용한다. 이 형식을 모든 Supabase 기능을 포함한 플랫폼 백업이라고 설명하지 않는다.

이미지는 원본과 표시용 객체를 암호화하고 각 파일의 SHA-256과 길이를 검증한다. JSON에는 서명 URL 대신 안정적인 객체 경로를 기록한다. DB는 단일 SELECT의 동일 스냅샷으로 조회한다. 백업 중 ready 사진이 사라지면 정상 완료로 기록하지 않는다. WASM 런타임은 repo의 고정 해시와 `publish:edge-runtime`으로 별도 재배포한다.

### 별도의 빈 프로젝트에 복원할 때

1. 복원 전용 Supabase 프로젝트를 준비하고 같은 마이그레이션 8개를 순서대로 적용한다. 공개 프런트엔드에는 연결하지 않는다.
2. 원본과 다른 project ref이며 Auth 사용자와 앱 테이블이 모두 빈 상태인지 확인한다.
3. 복구 키와 manifest·사진 무결성을 확인한다. 30일이 지난 백업 또는 백업 이후 원본에 삭제 요청이 있는 경우 자동 복원을 거절한다.
4. 아래 명령으로 사진을 먼저 업로드하고 DB를 트랜잭션으로 복원한다. 기존 목표 프로젝트 데이터를 덮어쓰지 않는다. 실패한 사진 업로드 재시도는 동일 해시 파일만 재사용한다.
5. A/B/익명 RLS, 펫/성장/게시물 수, 사진 해시, 비공개 차단, 공개 취소, 사용자 삭제 이력을 확인한다.
6. 인증 제공자·SMTP·콜백·Edge 함수·WASM·예약 설정을 별도로 연결한다. 복원 과정은 사용자를 새로 로그인시킨다.
7. 검증이 끝나기 전에는 배포 환경변수를 전환하지 않는다.

```bash
node scripts/cloud-backup.mjs restore .backups/BACKUP_DIRECTORY --target TARGET_PROJECT_REF --confirm-target TARGET_PROJECT_REF
```

현재 복원 증거는 PGlite의 별도 빈 스키마에 실제 마이그레이션과 암호화 스냅샷을 적용한 결과다. 별도 호스팅 프로젝트에서 Auth·Storage 전체 복구가 검증됐다는 뜻은 아니다. 실제 사용자 데이터 백업·별도 호스팅 복원은 승인과 대상 준비 후 수행한다.

## 검증 근거

- `tests/server/operations.test.mjs`: 권한, 신고/차단, 자동 만료, 파일별 정리 실패·임대 토큰, 삭제 중 접근 차단, 초기 프로필·처리 중 사진 경계.
- `tests/server/operations-handler.test.mjs`: 실제 AMR 시각, 위조/과대 요청 거절, 비밀 검증, HTTP·Storage/Auth 오류 재시도.
- `tests/server/backup-restore.test.mjs`: AES-GCM 변조/다른 키 거절, DB·사진 바이트 복원, 복원 후 RLS.
- `tests/operations.spec.ts`: 삭제 이중 확인/재인증 안내, 신고 응답·차단 확인, 사용자 백업 다운로드, 지연 로딩 실패 복구. 모의 API 사용.
- 기존 전체 앱·브라우저 검사와 일반 production 빌드는 별도로 기록한다. SMTP 실수신·실물 모바일·공개 S5 연동은 미확인이다.

## 적용을 승인받으면 확인할 시나리오

1. 임시 사용자 A가 공개 글과 스토리 생성 → B가 신고 → 운영자가 해당 신고만 숨김 → 익명·B의 새 이미지 요청 차단.
2. B가 A 차단 → 상호 팔로우·피드·스토리·댓글·알림 제한 → 해제 후 공개 조회 복구.
3. 임시 A의 삭제 요청 → 재인증 거부/정상 요청 → deleting 상태 → 예약 정리·재시도 → Storage 확인 → Auth 제거. 실제 기존 계정은 건드리지 않음.
4. 예약 작업이 앱 접속 없이 실행되고, 실패 원문/토큰/사진/신고 본문이 공용 로그에 남지 않음.
5. 암호화 백업 검증과 별도 빈 프로젝트 복원 결과를 이 문서에 추가함.

### 로컬 검증 결과 (2026-10-15)

- 앱 40개 파일·195개 통과.
- 격리 서버 전체 56개 통과. 이후 복원 토큰 초기화/빈 대상 잠금 경계를 같은 복원 검사로 다시 확인했다.
- Chromium 전체 79개 통과 후 S5 폼·사진 포함 사용자 백업·다국어/테마/너비와 기존 프로필/기기 흐름 관련 23개 재검사 통과.
- 타입·변경 파일 린트·일반 `npm run build` 통과. JS 엔트리 197.69KB와 공유 Supabase 청크 257.14KB 등으로 분리했다. 이는 초기 전체 전송량이나 실물 기기 성능 지표가 아니다.
- README와 S5 모의 화면 캡처를 갱신했다. 실제 Supabase S5 변경·전체 계정/사진 백업·공개 배포는 실행하지 않았다.
