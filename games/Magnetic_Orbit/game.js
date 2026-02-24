const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI 엘리먼트
const menuScreen = document.getElementById('menuScreen');
const startBtn = document.getElementById('startBtn');
const scoreDisplay = document.getElementById('scoreDisplay');
const menuTitle = document.getElementById('menuTitle');
const menuSubtitle = document.getElementById('menuSubtitle');
const finalScoreContainer = document.getElementById('finalScoreContainer');
const finalScore = document.getElementById('finalScore');
const statusIcon = document.getElementById('statusIcon');

// 게임 상태
let GAME_STATE = 'MENU';
let score = 0;
let frameCount = 0;

// 반응형 변수들
let dpr = 1;
let logicalWidth, logicalHeight;
let cx, cy;
let baseSize;
let minRadius, maxRadius;

// 입력 상태
let isPressing = false;

// 게임 오브젝트
let player = { angle: 0, radius: 0, vR: 0, size: 0, color: '#06b6d4' };
let enemies = [];
let particles = [];

// 🎯 캔버스 크기 조절 (줌아웃 효과 적용)
function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    logicalWidth = window.innerWidth;
    logicalHeight = window.innerHeight;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;

    ctx.scale(dpr, dpr);

    cx = logicalWidth / 2;
    cy = logicalHeight / 2;

    baseSize = Math.min(logicalWidth, logicalHeight);

    // 시야 확장을 위해 플레이어의 최대/최소 궤도를 대폭 축소 (기존 0.45 -> 0.25)
    minRadius = baseSize * 0.05;
    maxRadius = baseSize * 0.25;

    if (GAME_STATE !== 'PLAYING') {
        player.radius = (minRadius + maxRadius) / 2;
    }
    // 월드가 넓어진 만큼 플레이어 크기도 살짝 축소
    player.size = baseSize * 0.012 + 3;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 입력 이벤트 핸들러
function handleInteractionStart(e) {
    if (e.target === startBtn || e.target.closest('#menuScreen')) return;
    if (e.cancelable) e.preventDefault();
    isPressing = true;
}

function handleInteractionEnd(e) {
    if (e.target === startBtn || e.target.closest('#menuScreen')) return;
    if (e.cancelable) e.preventDefault();
    isPressing = false;
}

window.addEventListener('mousedown', handleInteractionStart, { passive: false });
window.addEventListener('mouseup', handleInteractionEnd, { passive: false });
window.addEventListener('touchstart', handleInteractionStart, { passive: false });
window.addEventListener('touchend', handleInteractionEnd, { passive: false });
window.addEventListener('touchcancel', handleInteractionEnd, { passive: false });

// 파티클 생성
function createParticles(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * (baseSize * 0.015),
            vy: (Math.random() - 0.5) * (baseSize * 0.015),
            life: 1.0, color: color,
            size: Math.random() * (player.size * 0.8) + 1
        });
    }
}

// 게임 시작
function initGame() {
    resizeCanvas();
    player.angle = 0;
    player.radius = maxRadius * 0.8;
    player.vR = 0;
    enemies = [];
    particles = [];
    score = 0;
    frameCount = 0;
    isPressing = false;
    scoreDisplay.innerText = '0';

    GAME_STATE = 'PLAYING';
    menuScreen.classList.add('hidden');
}

// 적 생성
function spawnEnemy() {
    let angle = Math.random() * Math.PI * 2;
    // 시야가 넓어졌으므로 화면 밖 훨씬 먼 곳에서 생성하여 충분히 다가오는 것을 볼 수 있게 함
    let dist = Math.sqrt(logicalWidth * logicalWidth + logicalHeight * logicalHeight) / 2 + 50;
    let x = cx + dist * Math.cos(angle);
    let y = cy + dist * Math.sin(angle);

    let targetAngle = angle + Math.PI + (Math.random() * 0.6 - 0.3);
    let diffMultiplier = 1 + (score / 1500); // 난이도에 따른 속도 증가

    // 빠른 장애물 기믹: 15% 확률로 속도가 빠른 파편 생성
    let isFast = Math.random() < 0.15;
    let baseSpeed = (baseSize * 0.004) * diffMultiplier;
    let finalSpeed = isFast ? baseSpeed * 2.2 : baseSpeed; // 빠른 파편은 2.2배 빠름

    // 파편 색상: 빠른 파편은 노란색, 일반 파편은 기존 붉은색
    let enemyColor = isFast ? '#fbbf24' : '#f43f5e';
    let glowColor = isFast ? 'rgba(251, 191, 36, 0.2)' : 'rgba(244, 63, 94, 0.2)';

    enemies.push({
        x: x, y: y,
        vx: Math.cos(targetAngle) * finalSpeed,
        vy: Math.sin(targetAngle) * finalSpeed,
        size: Math.random() * (baseSize * 0.01) + (baseSize * 0.008),
        color: enemyColor,
        glowColor: glowColor
    });
}

// 게임 오버
function gameOver() {
    GAME_STATE = 'GAMEOVER';
    isPressing = false;

    let px = cx + player.radius * Math.cos(player.angle);
    let py = cy + player.radius * Math.sin(player.angle);
    createParticles(px, py, player.color, 50);

    setTimeout(() => {
        menuScreen.classList.remove('hidden');
        menuTitle.innerText = "CRITICAL HIT";
        menuTitle.className = "text-2xl md:text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-500 tracking-tight";
        menuSubtitle.innerText = "파편과 충돌하여 궤도를 잃었습니다.";

        finalScoreContainer.classList.remove('hidden');
        finalScore.innerText = Math.floor(score);

        startBtn.innerText = "재시작 (RETRY)";
        startBtn.className = "w-full py-4 px-6 bg-gradient-to-r from-rose-500 to-orange-600 hover:from-rose-400 hover:to-orange-500 text-white font-bold text-lg rounded-xl transition-all transform active:scale-95 shadow-[0_0_20px_rgba(244,63,94,0.4)] cursor-pointer";

        statusIcon.className = "w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-orange-600 mb-4 flex items-center justify-center shadow-lg shadow-rose-500/30 animate-pulse";
    }, 1000);
}

// 로직 업데이트
function update() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.015;
        if (p.life <= 0) particles.splice(i, 1);
    }

    if (GAME_STATE !== 'PLAYING') return;

    frameCount++;
    score += 0.1;
    scoreDisplay.innerText = Math.floor(score);

    // 1. 플레이어 궤도 물리 연산
    let angularVelocity = 0.012 + (minRadius / player.radius) * 0.015;
    player.angle += angularVelocity;

    // 🎯 중력(당기는 힘) 및 원심력(미는 힘)을 부드럽게 대폭 감소
    let pullForce = baseSize * -0.0012; // (기존 -0.003)
    let pushForce = baseSize * 0.0006;  // (기존 0.0015)
    let force = isPressing ? pullForce : pushForce;

    player.vR += force;
    player.vR *= 0.88; // 마찰력 유지
    player.radius += player.vR;

    // 궤도 이탈 방지
    if (player.radius < minRadius) {
        player.radius = minRadius; player.vR = 0;
    }
    if (player.radius > maxRadius) {
        player.radius = maxRadius; player.vR *= -0.4; // 튕기는 탄성 감소
    }

    let px = cx + player.radius * Math.cos(player.angle);
    let py = cy + player.radius * Math.sin(player.angle);

    // 2. 적 스폰
    // 파편이 더 오래 화면에 머물기 때문에 생성 주기(Rate)를 조금 늦춤
    let spawnRate = Math.max(25, 70 - Math.floor(score / 35));
    if (frameCount % spawnRate === 0) spawnEnemy();

    // 3. 충돌 검사
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.x += e.vx; e.y += e.vy;

        let dx = px - e.x;
        let dy = py - e.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        let hitDist = (player.size + e.size) * 0.7;

        if (dist < hitDist) {
            createParticles(e.x, e.y, e.color, 20);
            enemies.splice(i, 1);
            gameOver();
            break;
        }

        // 화면을 크게 벗어난 파편 제거
        let distFromCenter = Math.sqrt((e.x - cx) * (e.x - cx) + (e.y - cy) * (e.y - cy));
        let maxDist = Math.max(logicalWidth, logicalHeight) + 200;
        if (distFromCenter > maxDist) enemies.splice(i, 1);
    }
}

// 화면 렌더링
function draw() {
    ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // 중심 항성
    ctx.beginPath();
    ctx.arc(cx, cy, minRadius - (baseSize * 0.01), 0, Math.PI * 2);
    let gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, minRadius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, isPressing ? '#3b82f6' : '#0ea5e9');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();

    // 가이드라인 (최대 궤도 - 축소된 영역)
    ctx.beginPath();
    ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 외곽 장식 (넓어진 시야를 보여주기 위한 큰 테두리선)
    ctx.beginPath();
    ctx.arc(cx, cy, baseSize * 0.45, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.03)';
    ctx.setLineDash([10, 15]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]); // 대시 리셋

    // 플레이어
    if (GAME_STATE === 'PLAYING') {
        let px = cx + player.radius * Math.cos(player.angle);
        let py = cy + player.radius * Math.sin(player.angle);

        ctx.beginPath();
        ctx.arc(px, py, player.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${isPressing ? 0.4 : 0.2})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, player.size, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
    }

    // 적
    enemies.forEach(e => {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = e.glowColor || 'rgba(244, 63, 94, 0.2)';
        ctx.fill();
    });

    // 파티클
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

// 게임 루프
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 명시적인 클릭 이벤트 등록
startBtn.addEventListener('click', (e) => {
    initGame();
});

window.onload = function () {
    gameLoop();
};
