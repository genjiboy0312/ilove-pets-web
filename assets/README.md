# 로그인 안내 일러스트

- 용도: 비로그인 내 계정 카드의 기존 발바닥 아이콘을 대체하는 동물 가족 이미지.
- 생성일: 2026-10-15.
- 생성 방식: 내장 `image_gen` 도구, 새 이미지 생성, `transparent_background: true`.
- 구성: 웰시코기·고양이·도마뱀·토끼·작은 새·햄스터 총 6마리.
- [생성 원본 PNG](source/pet-family-welcome-v1.png): 1536 × 1024, RGBA, 2,438,018 bytes.
- [웹 배포용 WebP](../public/images/pet-family-welcome-v1.webp): 768 × 512, alpha 보존, 74,818 bytes.
- 최적화: Sharp로 비율을 유지해 너비 768px로 축소하고 WebP quality 86 / alphaQuality 100 / effort 6으로 인코딩했다. 그림의 구성이나 배경을 별도로 편집하지 않았다.
- UI 크기: 최대 너비 272px, 높이 168px, `object-fit: contain`. 장식 이미지이므로 빈 alt를 사용한다.

## 최종 생성 프롬프트

```text
Use case: stylized-concept. Asset type: transparent illustration for the top of a pet community app sign-in card, displayed about 260 by 170 CSS pixels. Create exactly SIX original adorable 3D toy-like animal characters huddled closely as a loving found family: one tan-and-white Welsh corgi dog with large ears and short legs, one cream and orange cat, one small mint-sage green gecko/lizard with rounded snout and tiny toes, one soft white rabbit with upright ears, one little pastel blue bird, and one golden hamster with round cheeks. All six must have distinct visible faces and readable silhouettes, no duplicates, no extra animals. Charming rounded proportions, short limbs, expressive bead eyes, plush soft detailed fur for mammals, soft matte skin for gecko, velvety feathers for bird, premium playful 3D party-game mascot feel, original character designs. Gentle smiles, leaning against and embracing one another, peaceful welcoming family portrait, no combat. Corgi and cat near center with gecko clearly visible at the front, other three arranged cozily around them, all animals fully contained within frame. Wide compact triangular group, about 3:2 overall composition, centered, animals fill canvas well with modest transparent breathing room around ears and feet. Warm cream, caramel, sage, muted sky blue palette matching a calm sage-green pet journal. Soft studio lighting, subtle ambient occlusion between characters, clean antialiased edges. Genuinely transparent alpha background, no scene or floor rectangle, no opaque backdrop, no checkerboard pattern, no white background, no text, no logos, no watermark, no clothing, no accessories.
```
