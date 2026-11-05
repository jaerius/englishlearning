# 콘텐츠 배치 검수

`batch.json`은 `{ "packId": "business-meetings", "version": 1, "items": [...] }` 형식이다. 각 항목은 `WordSeed` 필드와 `review: { "status": "approved", "reviewer": "검수자", "reviewedAt": "YYYY-MM-DD" }`, `provenance: { "kind": "original", "note": "자체 작성" }`를 포함한다. 외부 자료를 반영했다면 `kind: "external"`과 `sourceUrl`, `license`도 기록한다.

`npm run check:batch -- staging/batch.json`은 기존 콘텐츠와 합쳐 중복·필수값·예문 형식을 검사한다. 통과해도 앱에 자동 게시하지 않는다. 검수한 항목만 별도 팩 소스에 옮겨 코드 리뷰와 테스트 후 배포한다. AI 초안은 `review.status: "draft"`로 두어 검사를 통과하지 못하게 한다. API 키나 개인 대화는 배치에 넣지 않는다.
