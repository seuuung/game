# 3D 지뢰찾기 (3D Minesweeper) — 종합 설계 문서

iOS 및 Android 크로스 플랫폼 애플리케이션으로 배포하기 위한 **3D 지뢰찾기** 프로젝트의 종합 설계서입니다.
이 문서는 게임의 규칙, 아키텍처, 내부 알고리즘, UI/UX 설계, 렌더링 최적화 등 모든 사항을 구체적으로 문서화하여 **Flutter 기반 모바일 네이티브 마이그레이션**의 지침으로 사용합니다.

---

## 1. 프로젝트 개요

기존 2D 평면 지뢰찾기의 룰을 **3차원 공간(N × N × N 큐브 형태)**으로 확장한 퍼즐 게임입니다.
사용자는 입체적으로 배열된 큐브 블록을 회전시키고, 내부를 파고들며 숨겨진 지뢰를 찾아냅니다.

### 1.1. 타겟 플랫폼 및 확정 기술 스택

| 항목 | 현재 구현 (웹 프로토타입) | 모바일 앱 (확정) |
|---|---|---|
| **프레임워크** | Vanilla HTML/JS | **Flutter** |
| **언어** | JavaScript (ES6+) | **Dart** |
| **3D 렌더링** | Three.js r128 (CDN) | **`three_dart`** + **`flutter_gl`** |
| **3D 헬퍼** | 커스텀 Quaternion 카메라 (순수 JS) | **`three_dart_jsm`** (OrbitControls, Sprite 등) + 커스텀 Quaternion 카메라 |
| **UI 스타일링** | 순수 CSS (Glassmorphism) | **Flutter Widget** + **`ThemeData`** + 커스텀 스타일 시스템 |
| **상태 관리** | 글로벌 `CONFIG` / `STATE` 객체 | **Riverpod** (경량 반응형 전역 상태) |
| **타겟 OS** | 웹 브라우저 | **iOS 14.0+**, **Android 8.0+** |
| **빌드/배포** | 없음 | **Flutter CLI** (`flutter build`) → App Store / Play Store |

### 1.2. 핵심 Flutter 패키지

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  three_dart: ^0.0.16          # Three.js의 Dart 포팅 (3D 렌더링 코어)
  three_dart_jsm: ^0.0.16      # Three.js 부가 모듈 (OrbitControls 등)
  flutter_gl: ^0.0.22          # OpenGL ES 바인딩 (네이티브 3D 렌더링)
  flutter_riverpod: ^2.x       # 반응형 전역 상태 관리
  go_router: ^14.x             # 선언적 라우팅
  shared_preferences: ^2.x     # 키-값 기반 로컬 데이터 저장
  wakelock_plus: ^1.x          # 화면 꺼짐 방지
  flutter_native_splash: ^2.x  # 네이티브 스플래시 스크린
  google_fonts: ^6.x           # Google Fonts 동적 로드
```

---

## 2. 게임 규칙 (Game Rules)

1. **목표**: N × N × N 3차원 격자 공간 내 숨겨진 지뢰를 모두 피하고, 안전한 모든 블록을 파내면(Revealed) 승리합니다.
2. **숫자의 의미**: 파낸 블록에 나타나는 숫자는 해당 블록을 감싸는 **인접 26개 공간(3×3×3 큐브 내 본인 제외)**에 숨겨진 지뢰의 총개수를 의미합니다.
3. **첫 클릭 안전성**: 플레이어의 첫 번째 '파기' 동작은 무조건 안전합니다. 지뢰는 첫 터치 이후에 Fisher-Yates 셔플로 배치됩니다.
   - **소형 맵 보호** (N < 4): 클릭한 셀 본인만 보호 (26방향 모두 보호 시 즉시 승리 방지)
   - **일반 맵 보호** (N ≥ 4): 클릭한 셀 + 주변 26칸 안전 보장
4. **패배 조건**: 지뢰가 숨어있는 블록을 '파기' 동작으로 열면 폭발과 함께 게임 오버.
5. **승리 조건**: `(전체 블록 수 - 지뢰 수)`만큼의 안전 블록을 모두 열면 즉시 클리어. 남은 지뢰 위치에 자동으로 깃발이 꽂힙니다.
6. **무제한 깃발**: 남은 지뢰 개수(0 이하)에 상관없이 깃발을 자유롭게 꽂고 뺄 수 있습니다 (음수값 표시 허용).
7. **복기 모드 (Review)**: 게임 종료 후 실수한 부분과 지뢰 위치를 관찰할 수 있는 관전자 모드를 제공합니다.

### 2.1. 난이도 프리셋

| 난이도 | 격자 크기 | 지뢰 수 | 총 블록 수 |
|:---:|:---:|:---:|:---:|
| 초급 | 3 × 3 × 3 | 4 | 27 |
| 중급 | 5 × 5 × 5 | 15 | 125 |
| 고급 | 7 × 7 × 7 | 50 | 343 |
| 커스텀 | 2~20 | 1 ~ (N³-2) | 8 ~ 8,000 |

커스텀 모드에서 **자동 지뢰 계산** 체크 시 `GameConfig.autoMineRatio`(기본 15%)를 적용합니다.

---

## 3. 조작 모드 및 터치 인터랙션 (Interactions & Modes)

3차원 공간 제어를 위해 하단 UI 패널에서 **한 번에 1개의 모드만** 선택하여 조작합니다.

### 3.1. 5가지 조작 모드

| 모드 | 아이콘 | 기능 | Widget 활성 상태 |
|---|:---:|---|---|
| **이동 (Pan)** | ✋ | 블록 터치 차단, 카메라 패닝/회전만 허용 | `isActive: mode == GameMode.pan` |
| **파기 (Dig)** | ⛏️ | 블록을 열어 숫자 확인. 지뢰 시 패배. 빈 칸은 연쇄 오픈 | `isActive: mode == GameMode.dig` |
| **깃발 (Flag)** | 🚩 | 지뢰 의심 블록에 마커 표시/해제 | `isActive: mode == GameMode.flag` |
| **탐색 (Highlight)** | 🔍 | 숫자(클릭) → 주변 블록 투시, 안 풀린 블록(꾹 누르기) → 주변 숫자 표시 | `isActive: mode == GameMode.highlight` |
| **연쇄 파기 (Chord)** | ⚡ | 숫자 주변에 해당 수만큼의 깃발이 있으면 나머지를 한꺼번에 열기 | `isActive: mode == GameMode.chord` |

### 3.2. 터치 제스처 분리 (Touch Event Handling)

모바일에서 "화면 회전(Drag)"과 "블록 터치(Tap)"의 충돌을 방지하기 위한 설계입니다.

| 제스처 | 기준 | 동작 |
|---|---|---|
| **탭 (Tap)** | 이동 거리 < `GameConfig.dragThreshold` (8px) | 현재 모드에 따라 파기/깃발/탐색/연쇄 실행 |
| **드래그 (Drag)** | 이동 거리 ≥ `GameConfig.dragThreshold` | Quaternion 기반 카메라 회전 또는 Pan 모드 시 평행이동 |
| **꾹 누르기 (Long Press)** | `GameConfig.longPressDuration` (300ms) 이상 유지 | 파기/깃발/Pan 모드에서 숫자 주변 블록 임시 투시 |
| **핀치 줌** | 2개 이상 터치 | 카메라 확대/축소, 블록 파기 판정 완전 차단 (`_isMultiTouch`) |
| **우클릭 (PC)** | 마우스 버튼 2 | 모드에 관계없이 깃발 토글 |

### 3.3. 이벤트 처리 흐름

```
onPointerDown → _mouseDown=true + 멀티터치 감지 + longPress 타이머 시작
    ↓
onPointerMove → [_mouseDown 시] Quaternion 회전 또는 Pan 이동
           → 드래그 거리 체크 → 임계값 초과 시 타이머 취소 + 호버 효과(PC, 비드래그 시)
    ↓
onPointerUp → _mouseDown=false + 멀티터치/롱프레스/드래그 필터링 → handleInteraction() 호출
```

---

## 4. 데이터 모델 및 상태 관리 (State Management)

### 4.1. GameConfig (게임 설정 - 불변)

```dart
class GameConfig {
  static const int gridSize = 5;          // 격자 크기 (N × N × N)
  static const int mineCount = 15;        // 지뢰 개수
  static const double blockSize = 1.0;    // 블록 물리적 크기
  static const double spacing = 1.05;     // 블록 간 간격 (1.0=밀착, 1.05=약간 틈)
  static const double dragThreshold = 8;  // 드래그 판정 임계값 (px)
  static const int longPressDuration = 300; // 꾹 누르기 판정 시간 (ms)
  static const double highlightScale = 1.4; // 숫자 강조 시 확대 배율
  static const double autoMineRatio = 0.15; // 자동 지뢰 비율 (15%)
}
```

### 4.2. GameState (게임 상태 - 가변, Riverpod StateNotifier 관리)

```dart
@freezed
class GameState with _$GameState {
  const factory GameState({
    @Default([]) List<Cell> cells,             // Cell 목록 — 모든 셀의 선형 배열
    @Default([]) List<List<List<Cell?>>> cellGrid, // Cell 3D 인덱스 배열 (O(1) 좌표 접근)
    @Default(0) int safeCellsRemaining,         // 남은 안전 셀 카운터 (0이면 승리)
    @Default(true) bool isFirstClick,           // 첫 클릭 여부 (지뢰 배치 트리거)
    @Default(GameStatus.menu) GameStatus status, // menu | playing | won | lost | review
    @Default(GameStatus.playing) GameStatus prevStatus, // 메뉴에서 돌아올 때 복구용
    @Default(GameMode.dig) GameMode currentMode, // dig | flag | highlight | chord | pan
    @Default(0) int minesLeft,                  // HUD 표시용 남은 지뢰 수
    Cell? hoveredCell,                           // 현재 호버된 셀 (PC 전용)
    @Default([]) List<Cell> highlightedCells,   // 강조 모드에서 밝게 표시된 셀 목록
  }) = _GameState;
}

enum GameStatus { menu, playing, won, lost, review }
enum GameMode { dig, flag, highlight, chord, pan }
```

### 4.3. Cell 데이터 구조

```dart
class Cell {
  final int x;                    // 3D 좌표 X
  final int y;                    // 3D 좌표 Y
  final int z;                    // 3D 좌표 Z
  three.Mesh? mesh;               // three_dart 3D 블록 객체
  bool isMine;                    // 지뢰 여부
  int neighborMines;              // 주변 26칸의 지뢰 수 (0~26)
  CellState state;                // hidden | revealed | flagged

  Cell({
    required this.x,
    required this.y,
    required this.z,
    this.isMine = false,
    this.neighborMines = 0,
    this.state = CellState.hidden,
  });
}

enum CellState { hidden, revealed, flagged }
```

**역참조 관계**: `mesh.userData['cell'] = cell` 설정으로 Mesh → Cell 간 O(1) 접근 보장.

---

## 5. 핵심 알고리즘 (Core Algorithms)

### 5.1. 지뢰 배치 — Fisher-Yates 셔플 (O(N))

```
placeMines(safeCell):
  1. 안전 구역 결정 (N≥4: safeCell + 주변26칸, N<4: safeCell만)
  2. 안전 구역 제외한 후보 셀 목록 구성
  3. 후보 부족 시 safeCell만 보호하도록 폴백
  4. Fisher-Yates 셔플로 1회 무작위 정렬
  5. 앞에서 mineCount만큼 isMine = true 설정
  6. 전체 셀의 neighborMines 값 사전 계산
```

### 5.2. 연쇄 오픈 — BFS 큐 기반 (스택 오버플로우 방지)

```
revealCell(startCell):
  if startCell.isMine → 패배 처리
  queue = Queue<Cell>()..add(startCell)
  while queue.isNotEmpty:
    cell = queue.removeFirst()
    if cell.state != CellState.hidden → continue
    cell.state = CellState.revealed, cell.mesh.visible = false
    safeCellsRemaining--
    if cell.neighborMines > 0 → 숫자 Sprite 생성
    else → 주변 26칸 중 hidden인 셀을 queue에 추가
  checkWinCondition()  // ← 전체 BFS 완료 후 단 1회만 호출
```

재귀(DFS) 대신 큐(BFS)를 사용하여 N=20 (8,000블록) 수준에서도 `Stack Overflow` 없이 안전하게 동작합니다.

### 5.3. 3D 인덱스 배열 — O(1) 좌표 접근

```dart
// cellGrid[x][y][z]로 즉시 접근 (선형 탐색 O(N³) 제거)
Cell? getCell(int x, int y, int z) {
  if (x < 0 || y < 0 || z < 0 ||
      x >= gridSize || y >= gridSize || z >= gridSize) return null;
  return state.cellGrid[x][y][z];
}

// 인접 26칸 탐색
List<Cell> getNeighbors(Cell cell) {
  final neighbors = <Cell>[];
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dz = -1; dz <= 1; dz++) {
        if (dx == 0 && dy == 0 && dz == 0) continue;
        final n = getCell(cell.x + dx, cell.y + dy, cell.z + dz);
        if (n != null) neighbors.add(n);
      }
    }
  }
  return neighbors;
}
```

### 5.4. 승리 판정 — O(1) 카운터 기반

`safeCellsRemaining` 카운터를 `revealCell()` 실행 시마다 감산하여, 0이 되는 순간 즉시 승리를 판정합니다.
매 클릭마다 전체 셀을 순회할 필요 없으므로 성능이 극대화됩니다.

### 5.5. 연쇄 파기 (Chording)

숫자 N이 표시된 **이미 열린 셀** 주변에, 사용자가 꽂은 깃발의 수가 정확히 N과 같을 때 트리거됩니다.
**나머지 hidden 블록을 모두 `revealCell()`로 자동 오픈**하며, 잘못된 깃발이 있었다면 지뢰를 밟아 패배합니다. 이는 전통적 지뢰찾기의 고급 편의 기능(Chording)을 완벽히 재현합니다.

---

## 6. 렌더링 및 비주얼 시스템 (Rendering & Visuals)

### 6.1. three_dart 렌더링 파이프라인

| 구성 요소 | 설정 | 목적 |
|---|---|---|
| **Renderer** | `three.WebGLRenderer` (`flutter_gl` 바인딩), `antialias: true` | 네이티브 OpenGL ES 고성능 렌더링 |
| **Pixel Ratio** | `math.min(devicePixelRatio, 2)` | 배터리/발열 최적화 |
| **Shadow** | `PCFSoftShadowMap`, 1024×1024 | 부드러운 그림자 |
| **Fog** | `FogExp2(0x1e293b, 0.015)` | 깊이감 연출 |
| **Camera** | `PerspectiveCamera(60°)` | 3D 시점 |
| **Controls** | 커스텀 Quaternion 카메라 (`applyCameraRotation()`) | 극점 제한 없는 360도 자유 회전 |

### 6.2. 텍스처 생성 시스템 — `createCanvasTexture()`

통합 헬퍼 함수로 256×256 Canvas에 배경색과 여러 이모지 레이어를 그려 three_dart 텍스처를 생성합니다.
Flutter에서는 `dart:ui`의 `Canvas`와 `PictureRecorder`를 활용하여 오프스크린 렌더링 후 텍스처로 변환합니다.

```dart
three.Texture createCanvasTexture(Color bgColor, List<TextureLayer> layers)
// layers: [TextureLayer(emoji: '🚩', fontSize: 140, x: 128, y: 128), ...]
```

| 텍스처 | 배경색 | 레이어 구성 |
|---|---|---|
| `texFlag` | `#f59e0b` (노랑) | 🚩 단일 |
| `texMine` | `#ef4444` (빨강) | 💣 단일 |
| `texFlagCorrect` | `#10b981` (초록) | 💣(배경) + 🚩(전경) 겹침 |
| `texFlagFalse` | `#fca5a5` (연빨강) | 🚩(중앙) + ❌(겹침) |

### 6.3. Material Registry 패턴 (`MaterialRegistry`)

기본(base)과 강조(highlight) 쌍을 구조화하여 관리합니다.

```dart
class MaterialRegistry {
  static final hidden = MaterialPair(
    base: three.MeshStandardMaterial({...}),
    highlight: three.MeshStandardMaterial({...}),
  );
  static final hovered = MaterialPair(
    base: three.MeshStandardMaterial({...}),
  );
  static final flagged = MaterialPair(
    base: /* texFlag 적용 */,
    highlight: /* texFlag + emissive */,
  );
  static final mine = MaterialPair(
    base: /* texMine 적용 */,
    highlight: /* texMine + emissive */,
  );
  static final flagCorrect = MaterialPair(
    base: /* texFlagCorrect 적용 */,
    highlight: /* texFlagCorrect + emissive */,
  );
  static final flagFalse = MaterialPair(
    base: /* texFlagFalse 적용 */,
    highlight: /* texFlagFalse + emissive */,
  );
}

class MaterialPair {
  final three.Material base;
  final three.Material? highlight;
  MaterialPair({required this.base, this.highlight});
}
```

`updateCellMaterial(cell)` 함수에서 `MaterialRegistry.xxx.base` / `.highlight`를 직접 참조하여 상태별 머티리얼을 결정합니다.

### 6.4. 게임 종료 시 시각적 피드백

| 상황 | 머티리얼 | 시각 효과 |
|---|---|---|
| **승리 시 자동 깃발** | `MaterialRegistry.flagCorrect.base` | 초록 바탕 + 지뢰 + 깃발 중첩 |
| **패배 시 찾은 지뢰** | `MaterialRegistry.flagCorrect.base` | 동일 (정답 확인) |
| **패배 시 못 찾은 지뢰** | `MaterialRegistry.mine.base` | 빨간 바탕 + 폭탄 노출 |
| **오답 깃발 (False Flag)** | `MaterialRegistry.flagFalse.base` | 연빨강 바탕 + 🚩 + ❌ 표시 |
| **탐색 강조 (일반)** | `MaterialRegistry.hidden.highlight` | 보라색 아우라 |
| **탐색 강조 (깃발)** | `MaterialRegistry.flagged.highlight` | 깃발 텍스처 + 보라색 발광 |
| **탐색 강조 (지뢰, 복기)** | `MaterialRegistry.mine.highlight` | 지뢰 텍스처 + 보라색 발광 |

### 6.5. 숫자 Sprite 시스템

열린 블록에 인접 지뢰 수를 Canvas 기반 Sprite로 표시합니다.

```
색상 팔레트: [없음, #60a5fa, #4ade80, #f87171, #c084fc, #fbbf24, #22d3ee, #f472b6, #e2e8f0]
                1(파랑)  2(초록)  3(빨강)  4(보라)  5(노랑)  6(시안)  7(핑크)  8(회색)
```

- `userData['cell']` 속성으로 Sprite ↔ Cell 양방향 추적
- 강조 모드에서 선택 시 `GameConfig.highlightScale` (1.4배)로 확대

### 6.6. 커스텀 카메라 제어 시스템 (Quaternion 기반)

기존 `OrbitControls` 라이브러리를 **완전히 제거**하고, 순수 Quaternion 기반 커스텀 카메라 제어 시스템을 구현했습니다.

#### 6.6.1. 시스템 아키텍처

| 구성 요소 | 설명 |
|---|---|
| **`CameraState`** | 카메라 상태 관리 (`target`, `distance`, `deltaTheta/Phi`, `dampingFactor`, `minDistance`, `maxDistance`) |
| **`applyCameraRotation(deltaTheta, deltaPhi)`** | 핵심 회전 함수 — 월드 Y축(좌우) + 로컬 Right축(상하) 기준 Quaternion 회전 |
| **`resetCamera(center, distance)`** | 카메라 초기화 — 대각선 위쪽에서 타겟을 내려다보는 시점 |

#### 6.6.2. OrbitControls 대비 개선점

| 특성 | OrbitControls (이전) | 커스텀 Quaternion (현재) |
|---|---|---|
| **극점(Pole) 제한** | `phi`가 0~π로 클랭핑되어 상하 180도 제한 | ❌ 제한 없음, 완전한 360도 회전 |
| **짐벌 락** | 극점 근처에서 좌우 회전 축소/정지 | ❌ 발생하지 않음 |
| **뒤집힘 시 좌우 반전** | 미지원 | ✅ `camera.up.y` 부호로 자동 보정 |
| **좌표 변환 충돌** | Spherical ↔ Quaternion 혼합 시 끊김 발생 | ❌ 순수 offset 벡터로 통일 |
| **조작 반응성** | 관성 적용으로 정밀 조작 어려움 | 관성(Damping) 100% 제거, 1:1 즉각적이고 정밀한 이동 및 회전 보장 |

#### 6.6.3. 이벤트 처리 흐름

```
[GestureDetector onPanUpdate + _mouseDown]
  ├─ Pan 모드: camera.matrix의 Right/Up 벡터 기반 평행이동
  └─ 그 외: applyCameraRotation(deltaTheta, deltaPhi)
       ├─ 좌우: 월드 Y축 기준 Quaternion 회전 (뒤집힌 경우 방향 반전)
       └─ 상하: camera.up × offset = Right축 기준 Quaternion 회전

[렌더 루프 (Timer / Ticker)]
  └─ 카메라 타겟 센터 포지션을 Grid 내부 범위로 부드럽게 유지 제한(clamp)

[확대/축소 (ScaleGestureDetector 핀치 줌)]
  └─ offset 벡터 길이를 비율(×1.1 / ×0.9 또는 터치 간격 비율) 조절 → 20x20x20 등 대형 큐브 플레이를 위해 블록이나 숫자 아이콘에 카메라가 걸리지 않도록 100% 관통 허용
```

#### 6.6.4. 카메라 이탈 방지 (Clamping)

렌더 루프(`Ticker`) 내에서 `CameraState.target` 좌표를 동적으로 제한합니다:
- 허용 범위: `[-gridSize*1.5, (gridSize-1)*spacing + gridSize*1.5]`
- `clampDouble()`을 사용한 x, y, z 축 개별 제한

---

## 7. UI/UX 설계 (Interface Design)

### 7.1. 레이아웃 구조

```
┌──────────────────────────────────┐
│  HUD 상단 (GlassPanel)           │  ← 제목, 남은 지뢰, 격자 크기
│  [3D 지뢰찾기] [남은: 15] [5×5×5]│     + 중앙 정렬 / 메뉴 버튼
├──────────────────────────────────┤
│                                  │
│      three_dart 3D 렌더링        │  ← IgnorePointer (UI 레이어)
│        (전체 화면 렌더링)          │     3D 블록 상호작용 영역
│                                  │
├──────────────────────────────────┤
│  모드 버튼 (GlassPanel)          │  ← ✋ ⛏️ 🚩 🔍 ⚡
│  ┌──┬──┬──┬──┬──┐               │
│  │이동│파기│깃발│탐색│연쇄│               │
│  └──┴──┴──┴──┴──┘               │
│  조작 가이드 (하단 텍스트)        │
└──────────────────────────────────┘
```

### 7.2. Glassmorphism 디자인 시스템

- **배경**: `RadialGradient(colors: [Color(0xFF1e293b), Color(0xFF0f172a)])`
- **유리 패널**: `ClipRRect` + `BackdropFilter(filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12))` + `Container(color: Color(0xB31e293b), border: Border.all(color: Colors.white.withOpacity(0.1)))`
- **그림자**: `BoxShadow(offset: Offset(0, 8), blurRadius: 32, color: Colors.black.withOpacity(0.5))`
- **외부 CDN 의존 없음**: 오프라인 환경에서도 완벽 렌더링

### 7.3. 반응형 디자인 (Responsive)

`MediaQuery.of(context).size.width`와 `LayoutBuilder`를 활용한 반응형 대응:
- 메뉴 패딩 축소 (`width < 640` 시 32 → 24)
- UI 레이어 패딩 축소 (16 → 8)
- 모드 버튼 크기/폰트 축소 (5개가 한 줄에 들어가도록 `Flexible` / `Expanded` 활용)
- 가이드 폰트 축소

### 7.4. 토스트 모달 (승리/패배)

| 상태 | 스타일 | 메시지 |
|---|---|---|
| 승리 | `ToastType.won` (초록 상단 보더 + 글로우) | "승리! 🎉" |
| 패배 | `ToastType.lost` (빨강 상단 보더 + 글로우) | "게임 오버! 💥" |

모달 내 버튼: **👀 복기** (리뷰 모드 진입) / **⚙️ 메뉴로** (시작 메뉴로 이동)
Flutter `AnimatedContainer` 및 `SlideTransition`으로 모달 등장 애니메이션 구현.

### 7.5. 시작 메뉴 구성

1. **돌아가기 버튼**: 진행 중인 게임이 있을 때만 표시 (`Visibility` 위젯)
2. **난이도 프리셋**: 초급/중급/고급 (`DifficultyButton` 위젯)
3. **게임 설명 (가이드)**: 별도 오버레이로 규칙 및 조작법 상세 설명 (`showModalBottomSheet` 또는 `Navigator.push`)
4. **커스텀 설정**: `Slider`(2~20) + 지뢰 수(자동/수동) + 총 블록 수 표시 + 유효성 검증

---

## 8. 메모리 관리 및 성능 최적화

### 8.1. Geometry 공유 및 재사용

- `blockGeo` (`BoxGeometry`): 모든 블록이 동일한 인스턴스를 공유
- `edgesGeo` (`EdgesGeometry`): 모든 테두리가 동일한 인스턴스를 공유
- `sharedGeometries = <three.BufferGeometry>{blockGeo, edgesGeo}`: initGame 시 dispose 보호

### 8.2. initGame() 메모리 해제 절차

```
1. Sprite의 material.map.dispose() → material.dispose()
2. Mesh의 자식(LineSegments) → geometry.dispose(공유 제외) → material.dispose()
3. Mesh.clear() (자식 객체 일괄 제거)
4. gridGroup.remove(child)
5. state.cells = [], state.cellGrid = [] (참조 해제)
```

### 8.3. Raycasting 최적화

| 기존 방식 | 개선된 방식 |
|---|---|
| `cells.where().map()` → 매번 Iterable 재생성 | `gridGroup.children` 직접 레이캐스트 |
| `cells.firstWhere(c => c.mesh == hit)` → O(N³) | `hit.userData['cell']` → O(1) |

`onPointerMove` 이벤트에서 특히 효과적이며, N=20 (8,000블록)에서도 GC 부하 없이 60fps를 유지합니다.

### 8.4. 공통 함수 추출로 코드 중복 제거

| 함수 | 역할 | 재사용 위치 |
|---|---|---|
| `createCanvasTexture()` | 이모지 텍스처 생성 | 깃발, 지뢰, 오답깃발, 정답깃발 |
| `highlightNeighbors(sprite)` | 숫자 주변 셀 강조 | 클릭 선택, 꾹 누르기 |
| `updateCellMaterial(cell)` | MaterialRegistry 기반 머티리얼 결정 | 모든 상태 변경 시 |

---

## 9. 파일 구조 및 의존성

### 9.1. 현재 파일 구조

```
games/3D_ minesweeper/
├── index.html       (178줄) — HTML 구조, UI 레이아웃, 외부 스크립트 로드
├── style.css        (581줄) — Glassmorphism 디자인 시스템, 반응형, 모드 버튼 스타일
├── script.js        (~1173줄) — 게임 엔진 전체 (설정, 렌더링, 로직, UI, 이벤트, 커스텀 카메라)
└── DESIGN_DOC.md    — 본 문서
```

### 9.2. 웹 프로토타입 외부 CDN 의존성

| 라이브러리 | URL | 상태 |
|---|---|---|
| Three.js r128 | `cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` | ✅ 사용 중 |
| ~~OrbitControls~~ | ~~`cdn.jsdelivr.net/.../OrbitControls.js`~~ | ❌ **제거됨** — 커스텀 Quaternion 시스템으로 대체 |

> ⚠️ OrbitControls CDN 스크립트는 index.html에 아직 로드 태그가 남아있으나, script.js에서 참조하지 않으므로 실제로 사용되지 않습니다. 추후 정리 시 제거 권장.
> Flutter에서는 모든 CDN 의존성을 pub.dev 패키지로 대체하여 오프라인 동작을 보장합니다.

### 9.3. Flutter 프로젝트 구조 (마이그레이션 대상)

```
minesweeper_3d/
├── lib/
│   ├── main.dart                      # 앱 진입점 (MaterialApp, GoRouter, ProviderScope)
│   ├── app/                           # 화면 (페이지) 레이어
│   │   ├── menu_screen.dart          # 시작 메뉴 화면
│   │   └── game_screen.dart          # 게임 플레이 화면
│   ├── features/
│   │   └── game/
│   │       ├── models/               # 데이터 모델
│   │       │   ├── cell.dart         # Cell 데이터 클래스
│   │       │   ├── game_state.dart   # GameState (freezed 기반)
│   │       │   └── game_config.dart  # GameConfig 상수 클래스
│   │       ├── providers/            # Riverpod 상태 관리
│   │       │   └── game_provider.dart # GameNotifier (StateNotifier)
│   │       ├── logic/                # 순수 게임 로직 함수
│   │       │   ├── mine_placer.dart  # placeMines (Fisher-Yates)
│   │       │   ├── cell_revealer.dart # revealCell (BFS 연쇄 오픈)
│   │       │   ├── chording.dart     # performChording (연쇄 파기)
│   │       │   └── neighbor_utils.dart # getCell, getNeighbors 유틸
│   │       └── rendering/           # 3D 렌더링 관련
│   │           ├── game_renderer.dart # three_dart 씬 초기화 및 렌더 루프
│   │           ├── block_builder.dart # 블록 Mesh 생성 및 배치
│   │           ├── sprite_builder.dart # 숫자 Sprite 생성
│   │           ├── material_registry.dart # Material 레지스트리
│   │           ├── texture_factory.dart # createCanvasTexture 구현
│   │           └── camera_controller.dart # 커스텀 Quaternion 카메라
│   ├── shared/                        # 공통 컴포넌트 및 유틸
│   │   ├── widgets/
│   │   │   ├── glass_panel.dart      # Glassmorphism 카드 위젯
│   │   │   ├── mode_button.dart      # 개별 모드 버튼 위젯
│   │   │   ├── difficulty_button.dart # 난이도 프리셋 버튼
│   │   │   └── game_modal.dart       # 승리/패배 토스트 모달
│   │   ├── theme/
│   │   │   └── app_theme.dart        # ThemeData 정의 (색상, 폰트, 글로벌 스타일)
│   │   └── utils/
│   │       └── haptic_utils.dart     # 햅틱 피드백 유틸 헬퍼
│   └── core/
│       ├── router.dart               # GoRouter 라우트 설정
│       └── constants.dart            # 앱 전역 상수
├── assets/                            # 앱 아이콘, 스플래시 등
├── pubspec.yaml                       # Flutter 패키지 설정
├── analysis_options.yaml              # Dart 린트 설정
└── android/ & ios/                    # 플랫폼별 네이티브 설정
```

---

## 10. Flutter 마이그레이션 상세 가이드

### 10.1. 웹 → Flutter 매핑 테이블

| 웹 프로토타입 | Flutter 대응 |
|---|---|
| `document.getElementById()` | `GlobalKey` / Riverpod 상태 (`ref.watch`) |
| `addEventListener('click')` | `GestureDetector` / three_dart Raycaster 직접 사용 |
| `classList.add/remove` | Widget 조건부 빌드 (`isActive ? activeStyle : defaultStyle`) |
| `innerHTML` / `textContent` | `Text()` 위젯 |
| CSS `backdrop-filter: blur()` | `BackdropFilter(filter: ImageFilter.blur())` (Flutter 내장) |
| Canvas 2D (텍스처 생성) | `dart:ui` Canvas + `PictureRecorder` → `Image` → three_dart Texture |
| `window.innerWidth/Height` | `MediaQuery.of(context).size` |
| `requestAnimationFrame` | `Ticker` / `Timer.periodic` 렌더 루프 |
| 커스텀 Quaternion 카메라 | Dart 기반 Quaternion 카메라 (three_dart의 `Quaternion`, `Vector3` 활용) |
| `THREE.Raycaster` | `three.Raycaster` (three_dart 내장, 동일 API) |
| 전역 `CONFIG` / `STATE` 객체 | `GameConfig` 클래스 + Riverpod `StateNotifier<GameState>` |
| CSS 미디어 쿼리 | `MediaQuery` + `LayoutBuilder` |
| `localStorage` | `shared_preferences` 패키지 |
| HTML `<canvas>` | `flutter_gl`의 `GLTexture` + `Texture` 위젯 |

### 10.2. Riverpod 스토어 설계 (`game_provider.dart`)

```dart
// Riverpod StateNotifier를 활용한 게임 상태 관리
final gameProvider = StateNotifierProvider<GameNotifier, GameState>((ref) {
  return GameNotifier();
});

class GameNotifier extends StateNotifier<GameState> {
  GameNotifier() : super(const GameState());

  // CONFIG (게임 시작 시 설정)
  int gridSize = 5;
  int mineCount = 15;

  // ACTIONS
  void startGame(int size, int mines) { /* ... */ }
  void revealCell(Cell cell) { /* ... */ }
  void toggleFlag(Cell cell) { /* ... */ }
  void performChording(Cell cell) { /* ... */ }
  void highlightNeighbors(Cell cell) { /* ... */ }
  void clearHighlight() { /* ... */ }
  void setMode(GameMode mode) {
    state = state.copyWith(currentMode: mode);
  }
}
```

### 10.3. three_dart 3D 렌더링 전략

```dart
// game_renderer.dart — 메인 3D 씬 초기화
class GameRenderer with TickerProviderStateMixin {
  late three.Scene scene;
  late three.PerspectiveCamera camera;
  late three.WebGLRenderer renderer;
  late three.Group gridGroup;

  void init(double width, double height) {
    scene = three.Scene();
    scene.fog = three.FogExp2(0x1e293b, 0.015);

    camera = three.PerspectiveCamera(60, width / height, 0.1, 1000);

    // 조명 설정
    scene.add(three.AmbientLight(0xffffff, 0.65));
    final dirLight = three.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    gridGroup = three.Group();
    scene.add(gridGroup);
  }

  void renderLoop() {
    // Ticker 기반 애니메이션 루프
    renderer.render(scene, camera);
  }
}

// block_builder.dart — 블록 Mesh 생성 (Geometry 공유)
class BlockBuilder {
  static final _blockGeo = three.BoxGeometry(1, 1, 1);
  static final _edgesGeo = three.EdgesGeometry(_blockGeo);

  static three.Mesh createBlock(Cell cell) {
    final mesh = three.Mesh(_blockGeo, MaterialRegistry.hidden.base);
    mesh.position.set(
      cell.x * GameConfig.spacing,
      cell.y * GameConfig.spacing,
      cell.z * GameConfig.spacing,
    );
    mesh.userData['cell'] = cell;

    // 테두리 와이어프레임
    final edges = three.LineSegments(
      _edgesGeo,
      three.LineBasicMaterial({'color': 0xffffff, 'opacity': 0.25, 'transparent': true}),
    );
    mesh.add(edges);

    return mesh;
  }
}
```

> **성능 핵심**: `three.Mesh` 생성 시 `BoxGeometry`와 `EdgesGeometry`를 정적 인스턴스로 공유하여 메모리 효율을 극대화합니다. N>10에서는 `InstancedMesh` 도입을 검토합니다.

### 10.4. 네이티브 API 연동

| 기능 | 패키지 / API | 적용 시점 |
|---|---|---|
| **진동 피드백** | `HapticFeedback` (`services.dart` 내장) | 게임 오버(`heavyImpact`) / 승리(`mediumImpact`) / 깃발 꽂기(`lightImpact`) |
| **데이터 저장** | `shared_preferences` | 하이스코어, 타임어택 기록, 마지막 난이도 설정 |
| **화면 잠금 방지** | `wakelock_plus` | 게임 플레이 중 (`status == GameStatus.playing`) |
| **세이프 에어리어** | `SafeArea` (Flutter 내장 위젯) | 노치, 홈 인디케이터, 펀치홀 대응 |
| **Glassmorphism** | `BackdropFilter` (Flutter 내장) | 유리 효과 패널 구현 (추가 패키지 불필요) |
| **스플래시 스크린** | `flutter_native_splash` | 앱 초기 로딩 화면 |
| **폰트** | `google_fonts` | 커스텀 타이포그래피 적용 |

### 10.5. 성능 목표

| 항목 | 기준 |
|---|---|
| 초기 로딩 (콜드 스타트) | < 2초 |
| 프레임 레이트 | 60fps (N ≤ 10), 30fps+ (N = 20) |
| APK / IPA 사이즈 | < 20MB (AOT 컴파일 최적화) |
| 메모리 사용 | < 150MB (N = 20) |
| 배터리 최적화 | Pixel Ratio 2 제한 + 렌더 루프 내 불필요한 연산 제거 |

---

## 11. 개발 로드맵 (Milestones)

1. **Phase 1: 웹 프로토타입 고도화** ✅ 완료
   - `DOMContentLoaded` 버그 수정, Tailwind CSS 제거 → Vanilla CSS
   - Material Registry 패턴, 텍스처 통합, 강조 로직 공통화
   - O(1) 역참조, 배열 재생성 제거, 매직 넘버 상수화
   - **OrbitControls 완전 제거 → 순수 Quaternion 기반 커스텀 카메라 시스템 구현**
   - 360도 무제한 자유 회전, 1:1 직접 조작 보장(관성 완전 제거), 모바일 핀치 줌 지원 및 무제한 투과 줌 인 구현.

2. **Phase 2: Flutter 프로젝트 초기화** 🔄 진행 예정
   - `flutter create` → Dart 프로젝트 생성
   - `three_dart` + `flutter_gl` 기반 3D 씬 구성
   - Riverpod `StateNotifier` 설계 및 게임 로직(순수 함수) 이식
   - GoRouter 기반 화면 구조 (시작 메뉴 / 게임 플레이)

3. **Phase 3: UI 위젯 및 터치 UX 구현** 📋 계획
   - Flutter Widget 기반 Glassmorphism 디자인 시스템 이식 (`BackdropFilter`, `ClipRRect`, `ThemeData`)
   - `SafeArea` + 하단 모드 버튼 패널 (`Row` + `ModeButton` 위젯)
   - `GestureDetector` + three_dart Raycaster 기반 터치 제스처 분리 (탭/드래그/롱프레스/핀치)
   - 토스트 모달 (`AnimatedContainer` / `SlideTransition` 활용)

4. **Phase 4: 네이티브 기능 연동** 📋 계획
   - `HapticFeedback` 진동 피드백 (Flutter 내장 API)
   - `shared_preferences` 하이스코어/타임어택 저장
   - 앱 아이콘 (`flutter_launcher_icons`), 스플래시 스크린 (`flutter_native_splash`) 디자인

5. **Phase 5: 최적화 및 배포** 📋 계획
   - `const` 위젯 / `shouldRepaint` 최적화로 불필요한 리빌드 방지
   - `InstancedMesh` 도입 검토 (N > 10)
   - `flutter build ios` → TestFlight (iOS) / `flutter build appbundle` → Internal Testing (Android)
   - App Store / Play Store 제출 (메타데이터, 스크린샷, 심사 대응)
