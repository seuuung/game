// --- Game Configuration & State ---
const CONFIG = {
    gridSize: 5,
    mineCount: 15,
    blockSize: 1,
    spacing: 1.05
};

const STATE = {
    cells: [],
    cellGrid: [], // 💡 3D 인덱스 배열 — O(1) 셀 접근용
    safeCellsRemaining: 0, // 💡 남은 안전 셀 카운터 — 승리 판정 최적화
    isFirstClick: true,
    status: 'menu',
    prevStatus: 'playing', // 💡 이전 상태 저장용
    minesLeft: 0,
    currentMode: 'dig', // 💡 모드 3가지 지원: 'dig', 'flag', 'highlight'
    hoveredCell: null,
    highlightedCells: [],
    activeSprite: null // 💡 현재 누르고 있는 숫자(Sprite) 상태 저장
};

// --- Three.js Setup ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1e293b, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = CONFIG.gridSize * 0.8;
controls.maxDistance = CONFIG.gridSize * 3.5;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(15, 25, 15);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
scene.add(dirLight);

// Group to hold all blocks
const gridGroup = new THREE.Group();
scene.add(gridGroup);

// 이미지 텍스처 생성
function createBlockTexture(emoji, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 256);

    ctx.font = '140px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(emoji, 128, 140);

    return new THREE.CanvasTexture(canvas);
}

const texFlag = createBlockTexture('🚩', '#f59e0b');
const texMine = createBlockTexture('💣', '#ef4444');
const texFlagHighlight = createBlockTexture('🚩', '#6b21a8'); // 💡 깃발 강조 시 바탕을 진한 보라색으로 변경

// Materials
const matHidden = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.2, metalness: 0.1 });
const matHovered = new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.1, metalness: 0.2, emissive: 0x112244 });
const matHighlight = new THREE.MeshStandardMaterial({ color: 0xa78bfa, roughness: 0.1, metalness: 0.2, emissive: 0x3b0764 }); // 💡 일반 강조는 원래의 부드러운 연보라색으로 복구
const matFlagged = new THREE.MeshStandardMaterial({ map: texFlag, color: 0xffffff, roughness: 0.4, emissive: 0x442200 });
const matFlaggedHighlight = new THREE.MeshStandardMaterial({ map: texFlagHighlight, color: 0xffffff, roughness: 0.1, metalness: 0.2, emissive: 0x4c1d95 }); // 💡 깃발 강조 시 진한 보라색 발광 효과 적용
const matMine = new THREE.MeshStandardMaterial({ map: texMine, color: 0xffffff, roughness: 0.2, emissive: 0x330000 });
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true });

// Geometry
const blockGeo = new THREE.BoxGeometry(CONFIG.blockSize, CONFIG.blockSize, CONFIG.blockSize);
const edgesGeo = new THREE.EdgesGeometry(blockGeo);

// UI Elements (DOMContentLoaded 이후에 초기화해야 하므로 let으로 선언)
let elMineCount, elGridDisplay, btnModeDig, btnModeFlag, btnModeHighlight, btnResume, modal, modalTitle, modalDesc, startMenuOverlay;

document.addEventListener('DOMContentLoaded', () => {
    elMineCount = document.getElementById('mine-count');
    elGridDisplay = document.getElementById('grid-size-display');
    btnModeDig = document.getElementById('btn-mode-dig');
    btnModeFlag = document.getElementById('btn-mode-flag');
    btnModeHighlight = document.getElementById('btn-mode-highlight'); // 💡 강조 버튼 추가
    btnResume = document.getElementById('btn-resume'); // 💡 돌아가기 버튼 추가
    modal = document.getElementById('message-modal');
    modalTitle = document.getElementById('message-title');
    modalDesc = document.getElementById('message-desc');
    startMenuOverlay = document.getElementById('start-menu-overlay');

    // UI Listeners setup
    document.getElementById('btn-restart').addEventListener('click', showStartMenu);
    document.getElementById('btn-modal-restart').addEventListener('click', showStartMenu);
    btnResume.addEventListener('click', resumeGame); // 💡 돌아가기 이벤트 연결

    // 💡 각 모드 버튼 클릭 시 다른 모드 해제 및 상태 변경
    btnModeDig.addEventListener('click', () => {
        STATE.currentMode = 'dig';
        clearHighlight(); // 모드 변경 시 강조 초기화
        updateUI();
    });

    btnModeFlag.addEventListener('click', () => {
        STATE.currentMode = 'flag';
        clearHighlight();
        updateUI();
    });

    btnModeHighlight.addEventListener('click', () => {
        STATE.currentMode = 'highlight';
        updateUI();
    });

    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const size = parseInt(e.currentTarget.dataset.size);
            const mines = parseInt(e.currentTarget.dataset.mines);
            startGame(size, mines);
        });
    });

    const checkAutoMines = document.getElementById('custom-auto-mines');
    const inputCustomSize = document.getElementById('custom-size');
    const inputCustomMines = document.getElementById('custom-mines');
    const displayTotalBlocks = document.getElementById('custom-total-blocks');

    function updateTotalBlocks() {
        if (!displayTotalBlocks) return;
        const size = parseInt(inputCustomSize.value) || 4;
        const total = Math.pow(size, 3);
        displayTotalBlocks.textContent = `(총 ${total}개 블록)`;

        const displayMinesRange = document.getElementById('custom-mines-range');
        if (displayMinesRange) {
            const maxMines = total - 2;
            displayMinesRange.textContent = `(허용 범위: 1 ~ ${maxMines})`;
        }
    }

    function calculateAutoMines() {
        if (checkAutoMines.checked) {
            const size = parseInt(inputCustomSize.value) || 4;
            // 게임성에 맞는 15% 정도의 쾌적한 지뢰 비율
            let autoMines = Math.floor(Math.pow(size, 3) * 0.15);
            if (autoMines < 1) autoMines = 1;
            inputCustomMines.value = autoMines;
            inputCustomMines.disabled = true;
            inputCustomMines.readOnly = true;
            inputCustomMines.style.pointerEvents = 'none';
        } else {
            inputCustomMines.disabled = false;
            inputCustomMines.readOnly = false;
            inputCustomMines.style.pointerEvents = 'auto';
        }
    }

    // 초기 상태 반영
    updateTotalBlocks();
    calculateAutoMines();

    const triggerAutoCalc = () => {
        updateTotalBlocks();
        if (checkAutoMines.checked) {
            calculateAutoMines();
        }
    };

    ['input', 'change', 'keyup', 'click'].forEach(evt => {
        inputCustomSize.addEventListener(evt, triggerAutoCalc);
    });

    checkAutoMines.addEventListener('change', calculateAutoMines);

    document.getElementById('btn-custom-start').addEventListener('click', () => {
        const size = parseInt(document.getElementById('custom-size').value);
        const mines = parseInt(document.getElementById('custom-mines').value);
        const errObj = document.getElementById('custom-error');

        if (isNaN(size) || size < 2 || size > 20) {
            errObj.textContent = "크기는 2에서 20 사이로 입력해주세요.";
            errObj.classList.remove('hidden');
            return;
        }

        // 💡 최소 2개의 안전 셀을 보장하여 게임 플레이 가능하도록 제한
        const maxMines = Math.pow(size, 3) - 2;
        if (isNaN(mines) || mines < 1 || mines > maxMines) {
            errObj.textContent = `지뢰 개수는 1개에서 ${maxMines}개 사이여야 합니다.`;
            errObj.classList.remove('hidden');
            return;
        }

        startGame(size, mines);
    });
});

function updateCellMaterial(cell) {
    if (cell.state === 'revealed') return;
    if (STATE.highlightedCells.includes(cell)) {
        // 💡 깃발이 꽂혀 있는 블록이라면 깃발 마크를 유지하면서 보라색으로 강조
        if (cell.state === 'flagged') {
            cell.mesh.material = matFlaggedHighlight;
        } else {
            cell.mesh.material = matHighlight;
        }
        return;
    }
    if (cell.state === 'flagged') {
        cell.mesh.material = matFlagged;
        return;
    }
    if (STATE.hoveredCell === cell) {
        cell.mesh.material = matHovered;
        return;
    }
    cell.mesh.material = matHidden;
}

function clearHighlight() {
    if (STATE.highlightedCells && STATE.highlightedCells.length > 0) {
        const cellsToUpdate = [...STATE.highlightedCells];
        STATE.highlightedCells = [];
        cellsToUpdate.forEach(n => updateCellMaterial(n));
    }
    // 💡 강조되었던 숫자가 있다면 원래 크기로 복구
    if (STATE.activeSprite) {
        STATE.activeSprite.scale.set(0.85, 0.85, 0.85);
        STATE.activeSprite = null;
    }
}

// --- Game Setup Logic ---

function startGame(size, mines) {
    CONFIG.gridSize = size;
    CONFIG.mineCount = mines;

    const d = size * 1.5;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.updateProjectionMatrix();

    controls.minDistance = size * 0.8;
    controls.maxDistance = size * 3.5;

    camera.position.set(size * 1.6, size * 1.3, size * 2.2);
    controls.target.set(
        (size - 1) * CONFIG.spacing / 2,
        (size - 1) * CONFIG.spacing / 2,
        (size - 1) * CONFIG.spacing / 2
    );

    startMenuOverlay.style.display = 'none';
    elGridDisplay.textContent = `${size} × ${size} × ${size}`;

    initGame();
}

function showStartMenu() {
    if (STATE.status !== 'menu') {
        STATE.prevStatus = STATE.status; // 💡 현재 상태 저장 (playing, won, lost)
    }
    STATE.status = 'menu';
    startMenuOverlay.style.display = 'flex';
    modal.classList.add('hidden');

    const elCustomSize = document.getElementById('custom-size');
    elCustomSize.value = CONFIG.gridSize;
    elCustomSize.dispatchEvent(new Event('input')); // 💡 초기 렌더링 시 값 동기화 트리거

    document.getElementById('custom-mines').value = CONFIG.mineCount;
    document.getElementById('custom-error').classList.add('hidden');

    // 💡 진행 중인 게임이 있고, 아직 플레이 중일 때만 돌아가기 버튼 표시
    if (STATE.cells.length > 0 && STATE.prevStatus === 'playing') {
        btnResume.classList.remove('hidden');
    } else {
        btnResume.classList.add('hidden');
    }
}

// 💡 게임으로 돌아가기 함수 추가
function resumeGame() {
    startMenuOverlay.style.display = 'none';
    STATE.status = STATE.prevStatus;
}

function initGame() {
    STATE.isFirstClick = true;
    STATE.status = 'playing';
    STATE.minesLeft = CONFIG.mineCount;
    STATE.safeCellsRemaining = Math.pow(CONFIG.gridSize, 3) - CONFIG.mineCount;
    STATE.hoveredCell = null;
    STATE.highlightedCells = [];
    document.body.style.cursor = 'default';
    updateUI();
    modal.classList.add('hidden');

    // 💡 기존 Sprite의 개별 텍스처 및 Material 해제
    while (gridGroup.children.length > 0) {
        const child = gridGroup.children[0];
        if (child.type === 'Sprite' && child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
        }
        gridGroup.remove(child);
    }
    STATE.cells = [];
    STATE.cellGrid = [];

    // 💡 3D 인덱스 배열 초기화 및 셀 생성
    for (let x = 0; x < CONFIG.gridSize; x++) {
        STATE.cellGrid[x] = [];
        for (let y = 0; y < CONFIG.gridSize; y++) {
            STATE.cellGrid[x][y] = [];
            for (let z = 0; z < CONFIG.gridSize; z++) {
                const mesh = new THREE.Mesh(blockGeo, matHidden);
                mesh.position.set(x * CONFIG.spacing, y * CONFIG.spacing, z * CONFIG.spacing);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                const edges = new THREE.LineSegments(edgesGeo, lineMaterial);
                mesh.add(edges);
                gridGroup.add(mesh);

                const cell = {
                    x, y, z, mesh,
                    isMine: false, neighborMines: 0, state: 'hidden'
                };
                STATE.cells.push(cell);
                STATE.cellGrid[x][y][z] = cell;
            }
        }
    }
}

// 💡 3D 인덱스 배열을 활용한 O(1) 셀 접근 (기존: find()로 O(N³) 탐색)
function getCell(x, y, z) {
    if (x < 0 || x >= CONFIG.gridSize || y < 0 || y >= CONFIG.gridSize || z < 0 || z >= CONFIG.gridSize) return null;
    return STATE.cellGrid[x][y][z];
}

function getNeighbors(cell) {
    const neighbors = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dy === 0 && dz === 0) continue;
                const n = getCell(cell.x + dx, cell.y + dy, cell.z + dz);
                if (n) neighbors.push(n);
            }
        }
    }
    return neighbors;
}

// 💡 Fisher-Yates 셔플 기반 지뢰 배치 — 무한 루프 위험 제거
function placeMines(safeCell) {
    let safeZone = new Set(getNeighbors(safeCell));
    safeZone.add(safeCell);

    // 안전 구역을 제외한 배치 가능 셀 목록 구성
    let candidates = STATE.cells.filter(c => !safeZone.has(c));

    // 안전 구역 제외 후에도 배치 슬롯이 부족하면 첫 클릭 셀만 보호
    if (candidates.length < CONFIG.mineCount) {
        candidates = STATE.cells.filter(c => c !== safeCell);
    }

    // Fisher-Yates 셔플 후 앞에서 mineCount개 선택
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const mineCount = Math.min(CONFIG.mineCount, candidates.length);
    for (let i = 0; i < mineCount; i++) {
        candidates[i].isMine = true;
    }

    // 각 셀의 주변 지뢰 수 계산
    STATE.cells.forEach(cell => {
        if (!cell.isMine) {
            cell.neighborMines = getNeighbors(cell).filter(n => n.isMine).length;
        }
    });
}

function createTextSprite(number) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const colors = ['#ffffff', '#60a5fa', '#4ade80', '#f87171', '#c084fc', '#fbbf24', '#22d3ee', '#f472b6', '#e2e8f0'];

    ctx.font = '900 80px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 12;
    ctx.strokeStyle = '#0f172a';
    ctx.strokeText(number.toString(), 64, 66);

    ctx.fillStyle = colors[number] || '#ffffff';
    ctx.fillText(number.toString(), 64, 66);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.85, 0.85, 0.85);
    return sprite;
}

// 💡 BFS 기반 셀 열기 — 재귀 스택 오버플로우 방지, checkWinCondition 1회만 호출
function revealCell(startCell) {
    if (startCell.state !== 'hidden' || STATE.status !== 'playing') return;

    // 지뢰를 밟은 경우 즉시 게임 오버
    if (startCell.isMine) {
        startCell.state = 'revealed';
        startCell.mesh.material = matMine;
        gameOver(false);
        return;
    }

    // BFS로 연쇄 열기 수행
    const queue = [startCell];
    while (queue.length > 0) {
        const cell = queue.shift();
        if (cell.state !== 'hidden') continue;

        cell.state = 'revealed';
        cell.mesh.visible = false;
        STATE.safeCellsRemaining--;

        if (cell.neighborMines > 0) {
            const sprite = createTextSprite(cell.neighborMines);
            sprite.position.copy(cell.mesh.position);
            sprite.userData = { cell: cell };
            gridGroup.add(sprite);
        } else {
            // 빈 셀이면 주변 hidden 셀을 큐에 추가
            getNeighbors(cell).forEach(n => {
                if (n.state === 'hidden') queue.push(n);
            });
        }
    }

    checkWinCondition();
}

function toggleFlag(cell) {
    if (STATE.status !== 'playing') return;
    if (cell.state === 'revealed') return;

    if (cell.state === 'hidden') {
        if (STATE.minesLeft <= 0) return;
        cell.state = 'flagged';
        STATE.minesLeft--;
    } else if (cell.state === 'flagged') {
        cell.state = 'hidden';
        STATE.minesLeft++;
    }
    updateCellMaterial(cell);
    updateUI();
}

function gameOver(isWin) {
    STATE.status = isWin ? 'won' : 'lost';

    if (!isWin) {
        STATE.cells.forEach(c => {
            if (c.isMine) {
                c.mesh.material = matMine;
                c.mesh.visible = true;
            }
        });
        modal.classList.remove('border-t-blue-500', 'border-t-green-400');
        modal.classList.add('border-t-red-500');
        modalTitle.textContent = "게임 오버!";
        modalTitle.className = "text-2xl sm:text-3xl font-black mb-1 drop-shadow-md text-red-500";
        modalDesc.textContent = "지뢰를 건드렸습니다 💥";
    } else {
        modal.classList.remove('border-t-blue-500', 'border-t-red-500');
        modal.classList.add('border-t-green-400');
        modalTitle.textContent = "승리!";
        modalTitle.className = "text-2xl sm:text-3xl font-black mb-1 drop-shadow-md text-green-400";
        modalDesc.textContent = "모든 안전한 구역을 찾았습니다 🎉";
    }

    modal.classList.remove('hidden');
}

// 💡 카운터 기반 승리 판정 — O(1) (기존: 매번 전체 배열 순회)
function checkWinCondition() {
    if (STATE.safeCellsRemaining === 0) {
        gameOver(true);
    }
}

// 💡 3가지 모드에 대응하는 UI 버튼 스타일 업데이트
function updateUI() {
    elMineCount.textContent = STATE.minesLeft;

    const inactiveClass = "flex-1 bg-slate-700 hover:bg-slate-600 text-gray-400 font-bold py-2 sm:py-3 rounded-lg transition-all shadow-inner border-2 border-transparent text-xs sm:text-base opacity-70 px-0 whitespace-nowrap";

    btnModeDig.className = inactiveClass;
    btnModeFlag.className = inactiveClass;
    btnModeHighlight.className = inactiveClass;

    if (STATE.currentMode === 'dig') {
        btnModeDig.className = "flex-1 bg-blue-500 text-white font-extrabold py-2 sm:py-3 rounded-lg transition-all shadow-md border-2 border-blue-200 text-xs sm:text-base transform scale-105 z-10 px-0 whitespace-nowrap";
    } else if (STATE.currentMode === 'flag') {
        btnModeFlag.className = "flex-1 bg-yellow-500 text-yellow-900 font-extrabold py-2 sm:py-3 rounded-lg transition-all shadow-md border-2 border-yellow-200 text-xs sm:text-base transform scale-105 z-10 px-0 whitespace-nowrap";
    } else if (STATE.currentMode === 'highlight') {
        btnModeHighlight.className = "flex-1 bg-purple-500 text-white font-extrabold py-2 sm:py-3 rounded-lg transition-all shadow-md border-2 border-purple-200 text-xs sm:text-base transform scale-105 z-10 px-0 whitespace-nowrap";
    }
}

// --- Interaction ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let mouseDownPos = { x: 0, y: 0 };
let longPressTimer = null;
let isLongPressing = false;
let activePointers = 0;
let isMultiTouch = false;

document.addEventListener('contextmenu', e => e.preventDefault());

function handleInteraction(clientX, clientY, isRightClick) {
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // 💡 강조 모드일 때: 숫자(Sprite)를 눌렀는지 가장 먼저 확인합니다.
    if (STATE.currentMode === 'highlight') {
        let spriteIntersects = raycaster.intersectObjects(gridGroup.children, false).filter(hit => hit.object.type === 'Sprite');

        // 💡 이미 크게 강조된 Sprite 때문에 바로 뒤에 가려진 원래 크기의 Sprite가 클릭되지 않는 현상 방지:
        // 만약 광선이 맞은 첫 번째 객체가 현재 강조된 객체이고, 그 뒤에 다른 객체가 더 있다면, 첫 번째를 무시하고 두 번째를 선택함
        if (spriteIntersects.length > 1 && spriteIntersects[0].object === STATE.activeSprite) {
            spriteIntersects.shift();
        }

        if (spriteIntersects.length > 0) {
            const sprite = spriteIntersects[0].object;
            // 💡 만약 클릭한 것이 이미 강조된 그것뿐이라면 그냥 강조만 해제함
            if (sprite === STATE.activeSprite) {
                clearHighlight();
                return;
            }

            if (sprite.userData && sprite.userData.cell) {
                clearHighlight(); // 기존 강조 지우기
                if (navigator.vibrate) navigator.vibrate(20);

                // 💡 현재 누른 숫자를 1.4배 확대하여 표시
                STATE.activeSprite = sprite;
                sprite.scale.set(1.4, 1.4, 1.4);

                const centerCell = sprite.userData.cell;
                const neighbors = getNeighbors(centerCell);
                // 💡 'hidden' 상태뿐만 아니라 'flagged' 상태인 블록도 탐색 범위에 포함
                STATE.highlightedCells = neighbors.filter(n => n.state === 'hidden' || n.state === 'flagged');
                STATE.highlightedCells.forEach(n => updateCellMaterial(n));
            }
        } else {
            // 강조 모드에서 허공이나 다른 블록을 누르면 강조 해제만 수행
            clearHighlight();
        }
        return; // 강조 모드에서는 블록 파기/깃발 꽂기 무시
    }

    // 파기 / 깃발 모드일 때의 기본 로직
    const interactableMeshes = STATE.cells.filter(c => c.state !== 'revealed').map(c => c.mesh);
    const intersects = raycaster.intersectObjects(interactableMeshes, false);

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const cell = STATE.cells.find(c => c.mesh === clickedMesh);

        if (cell) {
            const actionIsFlag = isRightClick || STATE.currentMode === 'flag';

            if (actionIsFlag) {
                toggleFlag(cell);
            } else {
                if (STATE.isFirstClick) {
                    placeMines(cell);
                    STATE.isFirstClick = false;
                }
                revealCell(cell);
            }
        }
    }
}

renderer.domElement.addEventListener('pointerdown', (e) => {
    activePointers++;
    if (activePointers > 1) isMultiTouch = true;

    if (STATE.status !== 'playing') return;
    mouseDownPos = { x: e.clientX, y: e.clientY };
    isLongPressing = false;

    // 강조 모드가 아닐 때 보조적으로 꾹 누르기 하이라이트를 지원 (0.3초)
    if (STATE.currentMode !== 'highlight') {
        longPressTimer = setTimeout(() => {
            isLongPressing = true;
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            let spriteIntersects = raycaster.intersectObjects(gridGroup.children, false).filter(hit => hit.object.type === 'Sprite');

            // 💡 꾹 누르기 하이라이트 중에도 똑같이 가려진 객체를 잡지 못하는 현상 방지
            if (spriteIntersects.length > 1 && spriteIntersects[0].object === STATE.activeSprite) {
                spriteIntersects.shift();
            }

            if (spriteIntersects.length > 0) {
                const sprite = spriteIntersects[0].object;

                if (sprite === STATE.activeSprite) {
                    return; // 이미 강조 중인 걸 계속 꾹 누르고 있으면 무시
                }

                if (sprite.userData && sprite.userData.cell) {
                    if (navigator.vibrate) navigator.vibrate(50);
                    clearHighlight(); // 이전 꾹 누르기 강조 지우기

                    // 💡 꾹 누르고 있는 숫자를 1.4배 확대하여 표시
                    STATE.activeSprite = sprite;
                    sprite.scale.set(1.4, 1.4, 1.4);

                    const centerCell = sprite.userData.cell;
                    const neighbors = getNeighbors(centerCell);
                    // 💡 'hidden' 상태뿐만 아니라 'flagged' 상태인 블록도 탐색 범위에 포함
                    STATE.highlightedCells = neighbors.filter(n => n.state === 'hidden' || n.state === 'flagged');
                    STATE.highlightedCells.forEach(n => updateCellMaterial(n));
                }
            }
        }, 300);
    }
});

renderer.domElement.addEventListener('pointermove', (e) => {
    if (STATE.status !== 'playing') return;

    const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
    if (dist > 8) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        if (isLongPressing) {
            clearHighlight();
            isLongPressing = false;
        }
    }

    if (e.pointerType === 'mouse') {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const interactableMeshes = STATE.cells.filter(c => c.state !== 'revealed').map(c => c.mesh);
        const intersects = raycaster.intersectObjects(interactableMeshes, false);

        if (intersects.length > 0) {
            const cell = STATE.cells.find(c => c.mesh === intersects[0].object);
            if (cell !== STATE.hoveredCell) {
                const oldHovered = STATE.hoveredCell;
                STATE.hoveredCell = cell;
                if (oldHovered) updateCellMaterial(oldHovered);
                if (STATE.hoveredCell) updateCellMaterial(STATE.hoveredCell);
                document.body.style.cursor = 'pointer';
            }
        } else {
            // 💡 flagged 셀에서도 호버 해제가 올바르게 동작하도록 수정
            if (STATE.hoveredCell && STATE.hoveredCell.state !== 'revealed') {
                const oldHovered = STATE.hoveredCell;
                STATE.hoveredCell = null;
                updateCellMaterial(oldHovered);
            }
            document.body.style.cursor = 'default';
        }
    }
});

renderer.domElement.addEventListener('pointerup', (e) => {
    activePointers--;
    if (activePointers < 0) activePointers = 0;

    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    if (STATE.status !== 'playing') {
        if (activePointers === 0) isMultiTouch = false;
        return;
    }

    if (isMultiTouch) {
        if (activePointers === 0) isMultiTouch = false;
        return;
    }

    // 꾹 누르고 있었다면 터치 무시 및 표시 해제 (단, 강조 모드가 아닐 때만 해제)
    if (isLongPressing) {
        clearHighlight();
        isLongPressing = false;
        return;
    }

    const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
    if (dist > 8) return;

    const isRightClick = e.button === 2;
    handleInteraction(e.clientX, e.clientY, isRightClick);

    if (activePointers === 0) isMultiTouch = false;
});

renderer.domElement.addEventListener('pointercancel', () => {
    activePointers--;
    if (activePointers < 0) activePointers = 0;
    if (activePointers === 0) isMultiTouch = false;

    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    isLongPressing = false;
    clearHighlight();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);

    // 💡 카메라 타겟을 격자 범위 내로 제한
    const margin = CONFIG.gridSize * 0.5;
    const maxBound = (CONFIG.gridSize - 1) * CONFIG.spacing + margin;
    const minBound = -margin;

    controls.target.x = THREE.MathUtils.clamp(controls.target.x, minBound, maxBound);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, minBound, maxBound);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, minBound, maxBound);

    controls.update();

    renderer.render(scene, camera);
}

window.onload = () => {
    showStartMenu();
    animate();
};
