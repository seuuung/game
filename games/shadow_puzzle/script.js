// --- 레벨 데이터 (디테일과 인지도를 대폭 높인 10개의 레벨) ---
const levels = [
    {
        name: "하트", // Level 1: 튜토리얼 성격의 직관적인 모양
        grid: [
            [0, 1, 1, 0, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 0, 0, 0]
        ],
        color: 0xef4444, symmetricY: true, symmetricX: false
    },
    {
        name: "고양이", // Level 2: 귀여운 동물
        grid: [
            [1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
            [1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1],
            [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0]
        ],
        color: 0x8b5cf6, symmetricY: true, symmetricX: false
    },
    {
        name: "사과", // Level 3: 잎사귀가 있어 비대칭인 과일
        grid: [
            [0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 0, 0, 0]
        ],
        color: 0x10b981, symmetricY: false, symmetricX: false
    },
    {
        name: "머그컵", // Level 4: 손잡이 때문에 뚜렷한 비대칭
        grid: [
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0]
        ],
        color: 0x3b82f6, symmetricY: false, symmetricX: false
    },
    {
        name: "검 (Sword)", // Level 5: 길쭉한 형태
        grid: [
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]
        ],
        color: 0x94a3b8, symmetricY: true, symmetricX: false
    },
    {
        name: "우산", // Level 6: 곡선이 들어간 우산
        grid: [
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0]
        ],
        color: 0xf43f5e, symmetricY: false, symmetricX: false
    },
    {
        name: "음표", // Level 7: 음악 기호
        grid: [
            [0, 0, 0, 0, 1, 1, 1, 1, 1],
            [0, 0, 0, 0, 1, 0, 0, 0, 1],
            [0, 0, 0, 0, 1, 0, 0, 0, 1],
            [0, 0, 0, 0, 1, 0, 0, 0, 1],
            [0, 0, 0, 0, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 0, 0, 0, 0],
            [1, 1, 1, 1, 0, 0, 0, 0, 0],
            [0, 1, 1, 0, 0, 0, 0, 0, 0]
        ],
        color: 0xec4899, symmetricY: false, symmetricX: false
    },
    {
        name: "집", // Level 8: 굴뚝이 있는 집
        grid: [
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
            [0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0]
        ],
        color: 0x84cc16, symmetricY: false, symmetricX: false
    },
    {
        name: "비행기", // Level 9: 날개가 넓은 비행기
        grid: [
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0]
        ],
        color: 0x0ea5e9, symmetricY: true, symmetricX: false
    },
    {
        name: "별", // Level 10: 최종 보스 느낌의 꽉 찬 별
        grid: [
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0],
            [1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1]
        ],
        color: 0xeab308, symmetricY: true, symmetricX: false
    }
];

let currentLevelIndex = 0;
let gameState = 'playing';
let currentTargetQuaternions = [];
let activeTargetQuaternion = null;
let correctStartTime = null;

const canvas = document.getElementById('game-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a202c);
scene.fog = new THREE.Fog(0x1a202c, 15, 60);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(0, 0, 30);
directionalLight.castShadow = true;

// 배열 크기가 커졌으므로 그림자 생성 영역(Frustum)을 더 넉넉하게 확장
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.left = -25;
directionalLight.shadow.camera.right = 25;
directionalLight.shadow.camera.top = 25;
directionalLight.shadow.camera.bottom = -25;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 60;
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0x90b0d0, 0.6);
fillLight.position.set(15, 10, 15);
scene.add(fillLight);

const environmentMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d3748,
    roughness: 0.9,
    metalness: 0.1
});

const wallGeometry = new THREE.PlaneGeometry(120, 120); // 벽도 조금 넓힘
const wall = new THREE.Mesh(wallGeometry, environmentMaterial);
wall.position.z = -15;
wall.receiveShadow = true;
scene.add(wall);

const floor = new THREE.Mesh(wallGeometry, environmentMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -10;
floor.receiveShadow = true;
scene.add(floor);

let puzzleGroup = new THREE.Group();
scene.add(puzzleGroup);

function adjustLayoutForScreen() {
    const isMobile = window.innerWidth < 768;

    // 블록이 커졌으므로 오프셋과 카메라 거리 재조정
    puzzleGroup.position.x = isMobile ? -4.0 : -2.0;

    if (isMobile) {
        camera.position.set(20, 15, 28);
    } else {
        camera.position.set(18, 14, 25);
    }
    camera.lookAt(0, 0, 0);
}

function loadLevel(index) {
    if (index >= levels.length) {
        gameState = 'ended';
        const endingModal = document.getElementById('ending-modal');
        endingModal.classList.remove('hidden');
        endingModal.classList.add('flex');
        return;
    }

    gameState = 'playing';
    correctStartTime = null;
    const levelData = levels[index];
    document.getElementById('level-text').innerText = `레벨 ${index + 1} / ${levels.length}`;

    const instruction = document.getElementById('instruction');
    instruction.innerText = "모양을 맞추고 2초 동안 기다리세요!";
    instruction.className = "pointer-events-auto text-lg text-white/80 animate-pulse transition-all duration-300 bg-black/30 px-6 py-2 rounded-full backdrop-blur-sm shadow-md";

    const nextContainer = document.getElementById('next-btn-container');
    nextContainer.classList.add('h-0', 'opacity-0');
    nextContainer.classList.remove('h-[52px]', 'opacity-100');

    currentTargetQuaternions = [];
    // 상하좌우 모든 방향(90도 단위) 및 뒤집어진 상태를 정답으로 인정
    for (let i = 0; i < 4; i++) {
        const qZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), i * Math.PI / 2);
        currentTargetQuaternions.push(qZ);

        const qFlip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        const qFlippedZ = new THREE.Quaternion().multiplyQuaternions(qZ, qFlip);
        currentTargetQuaternions.push(qFlippedZ);
    }

    while (puzzleGroup.children.length > 0) {
        const child = puzzleGroup.children[0];
        child.geometry.dispose();
        child.material.dispose();
        puzzleGroup.remove(child);
    }

    puzzleGroup.quaternion.identity();

    const grid = levelData.grid;
    const rows = grid.length;
    const cols = grid[0].length;
    const blockSize = 1;

    const material = new THREE.MeshStandardMaterial({
        color: levelData.color,
        roughness: 0.3,
        metalness: 0.2
    });
    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 1) {
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                const posX = (x - cols / 2 + 0.5) * blockSize;
                const posY = -(y - rows / 2 + 0.5) * blockSize;

                // 블록 개수가 많아졌으므로 깊이(Z축)를 더 넓게 퍼뜨려 뭉침을 방지하고 난이도를 유지
                const posZ = (Math.random() - 0.5) * 10;

                mesh.position.set(posX, posY, posZ);
                puzzleGroup.add(mesh);
            }
        }
    }

    randomizeRotation();
}

function randomizeRotation() {
    const euler = new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
    );
    puzzleGroup.quaternion.setFromEuler(euler);

    let tooClose = false;
    for (let tq of currentTargetQuaternions) {
        if (Math.abs(puzzleGroup.quaternion.dot(tq)) > 0.85) {
            tooClose = true;
            break;
        }
    }

    if (tooClose) {
        randomizeRotation();
    }
}

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#next-btn-container')) return;
    if (e.target.closest('#restart-btn')) return; // 리스타트 버튼 예외 처리

    if (gameState !== 'playing') return;
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointermove', (e) => {
    if (!isDragging || gameState !== 'playing') return;

    const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y
    };

    const rotationSpeed = 0.006;
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    const qX = new THREE.Quaternion().setFromAxisAngle(camUp, deltaMove.x * rotationSpeed);
    const qY = new THREE.Quaternion().setFromAxisAngle(camRight, deltaMove.y * rotationSpeed);

    const qTotal = new THREE.Quaternion().multiplyQuaternions(qX, qY);
    puzzleGroup.quaternion.premultiply(qTotal);

    previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointerup', () => {
    isDragging = false;
});

function checkWinCondition() {
    if (gameState !== 'playing') return;

    let maxDot = 0;
    let bestTarget = null;

    for (let tq of currentTargetQuaternions) {
        const dot = Math.abs(puzzleGroup.quaternion.dot(tq));
        if (dot > maxDot) {
            maxDot = dot;
            bestTarget = tq;
        }
    }

    // 각도 허용 범위를 더욱 타이트하게 줄였습니다 (0.975).
    if (maxDot > 0.980) {
        if (correctStartTime === null) {
            correctStartTime = Date.now();
        } else if (Date.now() - correctStartTime >= 2000) {
            // 2초(2000ms)가 경과하면
            // 부드러운 자석 애니메이션 연출을 위해 snapping 상태로 전환합니다.
            gameState = 'snapping';
            activeTargetQuaternion = bestTarget;
        }
    } else {
        correctStartTime = null;
    }
}

function animate() {
    requestAnimationFrame(animate);

    checkWinCondition();

    if (gameState === 'snapping') {
        // 부드럽게 정답 각도로 회전 (자석 효과)
        puzzleGroup.quaternion.slerp(activeTargetQuaternion, 0.1);

        // 거의 완벽하게 각도가 맞춰지면 정답 UI 표시
        if (Math.abs(puzzleGroup.quaternion.dot(activeTargetQuaternion)) > 0.999) {
            puzzleGroup.quaternion.copy(activeTargetQuaternion);
            gameState = 'success';

            const levelName = levels[currentLevelIndex].name;
            const instruction = document.getElementById('instruction');

            instruction.innerHTML = `정답입니다! 👏 <span class="text-white ml-2 opacity-90">('${levelName}')</span>`;
            instruction.className = "pointer-events-auto text-xl text-green-400 font-bold transition-all duration-300 bg-black/60 px-8 py-3 rounded-full backdrop-blur-md shadow-lg shadow-green-500/20";

            const nextContainer = document.getElementById('next-btn-container');
            nextContainer.classList.remove('h-0', 'opacity-0');
            nextContainer.classList.add('h-[52px]', 'opacity-100');
        }
    }

    puzzleGroup.position.y = Math.sin(Date.now() * 0.002) * 0.2;
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    adjustLayoutForScreen();
});

document.getElementById('next-btn').addEventListener('click', () => {
    currentLevelIndex++;
    loadLevel(currentLevelIndex);
});

document.getElementById('restart-btn').addEventListener('click', () => {
    const endingModal = document.getElementById('ending-modal');
    endingModal.classList.remove('flex');
    endingModal.classList.add('hidden');

    currentLevelIndex = 0;
    loadLevel(currentLevelIndex);
});

adjustLayoutForScreen();
loadLevel(currentLevelIndex);
animate();
