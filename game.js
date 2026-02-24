const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreText = document.getElementById('scoreText');
const highScoreText = document.getElementById('highScoreText');
const finalScore = document.getElementById('finalScore');
const finalHighScore = document.getElementById('finalHighScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

let MAX_DRAG_DIST = 160;
let cw, ch;
function resizeCanvas() {
    cw = window.innerWidth;
    ch = window.innerHeight;
    canvas.width = cw;
    canvas.height = ch;
    MAX_DRAG_DIST = Math.max(100, Math.min(160, Math.min(cw, ch) * 0.35));
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let state = 'MENU';
let score = 0;
let highScore = localStorage.getItem('slimeWallJumpHigh') || 0;
highScoreText.innerText = highScore;
let cameraY = 0;
let screenShake = 0;

let slime, fog, walls, particles, orbs, stars;

const GRAVITY = 0.4;
const FRICTION = 0.98;
const SLIDE_SPEED = 1.8;
const MAX_SPEED = 24;
const SLING_POWER = 0.22;
const WALL_EDGE_WIDTH = 15;

let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragCurrent = { x: 0, y: 0 };

// 배경 시차(Parallax)를 위한 별 입자 클래스
class Star {
    constructor() {
        this.x = Math.random() * cw;
        this.y = Math.random() * ch * 2 - ch;
        this.size = Math.random() * 2 + 0.5;
        this.speed = Math.random() * 0.3 + 0.05;
        this.alpha = Math.random() * 0.5 + 0.1;
    }
    draw(ctx, camY) {
        // 카메라 Y에 따라 시차 적용
        let py = this.y - camY * this.speed;
        // 화면을 벗어나면 위/아래로 루프
        py = ((py % (ch * 2)) + ch * 2) % (ch * 2) - ch * 0.5;

        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, py, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Slime {
    constructor() {
        this.radius = Math.max(12, Math.min(cw * 0.04, 16));
        this.x = cw / 2;
        this.y = ch - 100;
        this.vx = 0;
        this.vy = 0;
        this.color = '#06b6d4'; // 기본 Cyan
        this.glowColor = '#22d3ee';
        this.canJump = true;
        this.isSticking = false;
        this.squishX = 1;
        this.squishY = 1;
        this.stickTimer = 0;
        this.maxStickTime = 45;
        this.stickDirection = 0;
        this.boostTimer = 0;
        this.parachuteTimer = 0;

        this.trail = []; // 잔상 궤적
    }

    update() {
        // 잔상 기록
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > 15) this.trail.pop();

        if (this.boostTimer > 0) {
            this.boostTimer--;
            if (this.boostTimer === 0) {
                this.parachuteTimer = 100;
                this.vy = -2;
            }
            this.color = '#fbbf24';
            this.glowColor = '#fde047';
            if (Math.random() < 0.5) createParticles(this.x, this.y + this.radius, 1, '#fbbf24');
        } else if (this.parachuteTimer > 0) {
            this.parachuteTimer--;
            this.color = '#06b6d4';
            this.glowColor = '#22d3ee';
        } else if (!this.isSticking) {
            this.color = '#06b6d4';
            this.glowColor = '#22d3ee';
        }

        if ((!this.isSticking || this.stickTimer <= 0) && this.boostTimer <= 0) {
            if (this.parachuteTimer > 0) {
                this.vy += GRAVITY * 0.1;
                if (this.vy > 2.5) this.vy = 2.5;
            } else {
                this.vy += GRAVITY;
            }
        }
        if (!this.isSticking && this.boostTimer <= 0) {
            this.vx *= FRICTION;
        }

        this.x += this.vx;
        this.y += this.vy;

        let prevVx = this.vx;
        let prevVy = this.vy;

        let wasSticking = this.isSticking;
        this.isSticking = false;
        let touchingSideWall = false;
        let touchingFloor = false;
        let touchedWallRef = null;

        this.squishX += (1 - this.squishX) * 0.1;
        this.squishY += (1 - this.squishY) * 0.1;

        if (this.x - this.radius <= WALL_EDGE_WIDTH + 1) {
            this.x = WALL_EDGE_WIDTH + this.radius;
            touchingSideWall = true;
            this.stickDirection = -1;
            this.vx = 0;
            this.squishX = 0.6; this.squishY = 1.4;
        } else if (this.x + this.radius >= cw - WALL_EDGE_WIDTH - 1) {
            this.x = cw - WALL_EDGE_WIDTH - this.radius;
            touchingSideWall = true;
            this.stickDirection = 1;
            this.vx = 0;
            this.squishX = 0.6; this.squishY = 1.4;
        }

        for (let w of walls) {
            if (w.isDestroyed) continue;

            let cx = Math.max(w.x, Math.min(this.x, w.x + w.w));
            let cy = Math.max(w.y, Math.min(this.y, w.y + w.h));
            let dx = this.x - cx;
            let dy = this.y - cy;
            let distSq = dx * dx + dy * dy;

            let checkRadius = this.radius + 1.0;
            if (distSq <= checkRadius * checkRadius) {
                let dist = Math.sqrt(distSq);
                if (dist === 0) { this.y -= this.radius; continue; }

                let nx = dx / dist;
                let ny = dy / dist;
                let pen = this.radius - dist;

                if (pen > 0) {
                    this.x += nx * pen;
                    this.y += ny * pen;
                }

                if (this.boostTimer > 0) continue;

                if (w.type === 'bouncy') {
                    if (Math.abs(nx) > Math.abs(ny)) {
                        this.vx = nx * MAX_SPEED * 0.8;
                        this.vy = -12;
                    } else {
                        this.vy = ny * MAX_SPEED * 0.8;
                    }
                    this.canJump = true;
                    createParticles(cx, cy, 10, '#4ade80');
                    screenShake = 5;
                    this.squishX = 1.5; this.squishY = 0.5;
                    continue;
                }

                touchedWallRef = w;

                if (Math.abs(nx) > Math.abs(ny)) {
                    touchingSideWall = true;
                    this.stickDirection = nx > 0 ? -1 : 1;
                    this.vx = 0;
                    this.squishX = 0.6; this.squishY = 1.4;
                } else {
                    if (ny < 0) {
                        touchingFloor = true;
                        this.vy = 0;
                        this.vx *= 0.8;
                        this.squishX = 1.4; this.squishY = 0.6;
                    } else {
                        if (this.vy < 0) this.vy = 0;
                    }
                }
            }
        }

        if (touchingSideWall && !touchingFloor) {
            if (!wasSticking) {
                this.stickTimer = this.maxStickTime;
                this.parachuteTimer = 0;
                createParticles(this.x, this.y, 5, touchedWallRef ? touchedWallRef.color : '#0ea5e9');
                if (Math.abs(prevVx) > 4 || Math.abs(prevVy) > 4) screenShake = 2;
            }

            if (touchedWallRef && touchedWallRef.type === 'fragile') {
                touchedWallRef.isDecaying = true;
            }

            if (this.stickTimer > 0) {
                this.vy = 0;
                this.stickTimer--;
            } else {
                this.vy = SLIDE_SPEED;
                if (Math.random() < 0.2) createParticles(this.x, this.y, 1, '#475569');
            }

            this.isSticking = true;
            this.canJump = true;
            if (this.boostTimer <= 0) {
                this.color = '#0ea5e9';
                this.glowColor = '#38bdf8';
            }
        } else if (touchingFloor) {
            this.isSticking = true;
            this.canJump = true;
            this.stickDirection = 0;
            this.parachuteTimer = 0;
            if (touchedWallRef && touchedWallRef.type === 'fragile') touchedWallRef.isDecaying = true;
            if (this.boostTimer <= 0) {
                this.color = '#0ea5e9';
                this.glowColor = '#38bdf8';
            }
        } else {
            this.stickDirection = 0;
            if (touchedWallRef && touchedWallRef.type === 'fragile') touchedWallRef.isDecaying = false;
        }
    }

    draw(ctx) {
        // 잔상(Trail) 그리기
        if (this.trail.length > 1 && !this.isSticking) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = this.glowColor;
            ctx.lineWidth = this.radius * 1.5;
            // 투명도 그라데이션 대신 전체적으로 알파 적용 후 합성
            ctx.globalAlpha = 0.2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.glowColor;
            ctx.stroke();

            // 중심선 (더 밝게)
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.lineWidth = this.radius * 0.5;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        if (!this.isSticking || this.boostTimer > 0) {
            let stretch = Math.max(1, Math.min(1.4, 1 + Math.abs(this.vy) * 0.02));
            if (Math.abs(this.vy) > Math.abs(this.vx)) {
                ctx.scale(this.squishX / stretch, this.squishY * stretch);
            } else {
                ctx.scale(this.squishX * stretch, this.squishY / stretch);
            }
        } else {
            ctx.scale(this.squishX, this.squishY);
            if (this.stickTimer > 0 && this.stickTimer < 15) {
                ctx.translate((Math.random() - 0.5) * 2, 0);
            }
        }

        let r = this.radius;

        // 네온 글로우 효과 추가
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.glowColor;

        ctx.beginPath();
        if (this.stickDirection === -1 && this.boostTimer <= 0) {
            ctx.moveTo(-r + 2, -r * 0.85);
            ctx.bezierCurveTo(r * 1.8, -r, r * 1.8, r, -r + 2, r * 0.85);
            ctx.closePath();
        } else if (this.stickDirection === 1 && this.boostTimer <= 0) {
            ctx.moveTo(r - 2, -r * 0.85);
            ctx.bezierCurveTo(-r * 1.8, -r, -r * 1.8, r, r - 2, r * 0.85);
            ctx.closePath();
        } else {
            ctx.ellipse(0, 0, r, r, 0, 0, Math.PI * 2);
        }

        // 슬라임 몸통 그라데이션
        let grad = ctx.createRadialGradient(0, -r / 3, 0, 0, 0, r);
        grad.addColorStop(0, '#ffffff'); // 하이라이트
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(1, this.color);

        ctx.fillStyle = grad;
        ctx.fill();

        // 외곽선 글로우 리셋
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.stroke();

        let eyeOffsetX = 0;
        if (this.stickDirection === -1) eyeOffsetX = 2;
        if (this.stickDirection === 1) eyeOffsetX = -2;

        if (this.boostTimer > 0) {
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-2, -2); ctx.lineTo(-8, 1); ctx.fill();
            ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(2, -2); ctx.lineTo(8, 1); ctx.fill();
        } else {
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(-5 + eyeOffsetX, -3, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5 + eyeOffsetX, -3, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(-5 + eyeOffsetX, -3, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5 + eyeOffsetX, -3, 2, 0, Math.PI * 2); ctx.fill();
        }

        if (this.canJump && this.boostTimer <= 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'white';
            ctx.beginPath(); ctx.arc(0, -10, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }

        // 낙하산 그리기
        if (this.parachuteTimer > 0 && this.boostTimer <= 0 && !this.isSticking) {
            ctx.save();
            ctx.translate(0, -r - 18);

            let sway = Math.sin(Date.now() * 0.005) * 5;
            ctx.translate(sway, 0);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-4 - sway, 18); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(4 - sway, 18); ctx.stroke();

            let pGrad = ctx.createLinearGradient(0, -20, 0, 0);
            pGrad.addColorStop(0, '#f87171');
            pGrad.addColorStop(1, '#991b1b');

            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 22, Math.PI, 0);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 22, Math.PI, 0); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, 11, Math.PI, 0); ctx.stroke();

            ctx.restore();
        }

        ctx.restore();
    }
}

class Wall {
    constructor(x, y, w, h, type = 'normal') {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.type = type;
        this.isDecaying = false;
        this.life = 30;
        this.isDestroyed = false;

        if (type === 'normal') {
            this.color1 = '#1e293b';
            this.color2 = '#0f172a';
            this.highlight = '#475569';
            this.glow = 'transparent';
        } else if (type === 'fragile') {
            this.color1 = '#991b1b';
            this.color2 = '#450a0a';
            this.highlight = '#ef4444';
            this.glow = 'rgba(239, 68, 68, 0.4)';
        } else if (type === 'bouncy') {
            this.color1 = '#166534';
            this.color2 = '#052e16';
            this.highlight = '#22c55e';
            this.glow = 'rgba(34, 197, 94, 0.4)';
        }
    }

    update() {
        if (this.isDecaying && this.type === 'fragile') {
            this.life--;
            if (Math.random() < 0.4) createParticles(this.x + Math.random() * this.w, this.y + Math.random() * this.h, 1, this.highlight);

            if (this.life <= 0) {
                this.isDestroyed = true;
                createParticles(this.x + this.w / 2, this.y + this.h / 2, 25, this.highlight);
                screenShake = 6;
            }
        }
    }

    draw(ctx) {
        if (this.isDestroyed) return;

        ctx.save();
        if (this.isDecaying) {
            let shake = (Math.random() - 0.5) * 4;
            ctx.translate(shake, shake);
        }

        // 그림자 & 네온 글로우
        ctx.shadowBlur = this.type !== 'normal' ? 20 : 10;
        ctx.shadowColor = this.type !== 'normal' ? this.glow : 'rgba(0,0,0,0.8)';

        // 벽 그라데이션 채우기
        let grad = ctx.createLinearGradient(this.x, this.y, this.x + this.w, this.y + this.h);
        grad.addColorStop(0, this.color1);
        grad.addColorStop(1, this.color2);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, this.h, 6);
        ctx.fill();
        ctx.shadowBlur = 0; // 초기화

        // 유리처럼 매끄러운 모서리 하이라이트
        ctx.fillStyle = this.highlight;
        ctx.beginPath();
        if (this.w > this.h) {
            // 수평 벽
            ctx.roundRect(this.x, this.y, this.w, this.h * 0.2, [6, 6, 0, 0]);
            // 하단 반사광 추가
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.roundRect(this.x, this.y + this.h * 0.8, this.w, this.h * 0.2, [0, 0, 6, 6]);
        } else {
            // 수직 벽
            ctx.roundRect(this.x, this.y, this.w * 0.2, this.h, [6, 0, 0, 6]);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.roundRect(this.x + this.w * 0.8, this.y, this.w * 0.2, this.h, [0, 6, 6, 0]);
        }
        ctx.fill();

        // 바운스 벽 무늬 (테크/사이버 느낌)
        if (this.type === 'bouncy') {
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 2;
            if (this.w > this.h) {
                for (let i = 10; i < this.w - 10; i += 25) {
                    ctx.beginPath(); ctx.moveTo(this.x + i, this.y); ctx.lineTo(this.x + i + 10, this.y + this.h); ctx.stroke();
                }
            } else {
                for (let i = 10; i < this.h - 10; i += 25) {
                    ctx.beginPath(); ctx.moveTo(this.x, this.y + i); ctx.lineTo(this.x + this.w, this.y + i - 10); ctx.stroke();
                }
            }
        }

        // 테두리 라인
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, this.h, 6);
        ctx.stroke();

        ctx.restore();
    }
}

class Orb {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 12;
        this.baseY = y;
        this.offsetY = Math.random() * Math.PI * 2;
        this.pulse = 0;
    }
    update() {
        let time = Date.now() * 0.005;
        this.y = this.baseY + Math.sin(time + this.offsetY) * 6;
        this.pulse = Math.sin(time * 2) * 0.2 + 0.8; // 0.6 ~ 1.0
    }
    draw(ctx) {
        ctx.save();
        // 강렬한 노란색 글로우
        ctx.shadowBlur = 20 * this.pulse;
        ctx.shadowColor = '#facc15';

        let grad = ctx.createRadialGradient(this.x - 3, this.y - 3, 1, this.x, this.y, this.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#fde047');
        grad.addColorStop(1, '#ca8a04');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.pulse, 0, Math.PI * 2);
        ctx.fill();

        // 십자 반짝임 효과
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.radius - 5); ctx.lineTo(this.x, this.y + this.radius + 5);
        ctx.moveTo(this.x - this.radius - 5, this.y); ctx.lineTo(this.x + this.radius + 5, this.y);
        ctx.stroke();

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = (Math.random() - 0.5) * 12;
        this.life = 1;
        this.decay = Math.random() * 0.04 + 0.02;
        this.color = color;
        this.size = Math.random() * 4 + 2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function generateWall(topWall, scoreMultiplier) {
    let isHorizontal = Math.random() < 0.10;
    let w, h;

    // 모바일 환경(폭이 좁은 경우) 중앙 병목 방지
    // 큰 화면(PC)에서는 넉넉하게 띄우고, 폭이 좁아지면 간격 비율을 크게 줄임
    let baseMargin = cw < 600 ? 30 : 100; // 모바일이면 여백 최소한으로 보장
    let margin = Math.max(WALL_EDGE_WIDTH + baseMargin, cw * (cw < 600 ? 0.1 : 0.25));

    if (isHorizontal) {
        // 수평 벽: 너비는 너무 좁은 화면을 가리지 않게 상한선 제한
        let maxW = Math.max(cw - margin * 2 - 20, 50);
        w = Math.min(Math.random() * (cw * 0.2) + 60, maxW);
        h = Math.random() * 15 + 15;
    } else {
        // 수직 벽: 굵기(너비)는 화면의 일부분, 길이(높이)도 반응형 제한
        let maxW = Math.max(cw * 0.08, 20);
        w = Math.max(Math.random() * 20 + 20, maxW);
        let maxH = ch * (cw < 600 ? 0.25 : 0.35); // 모바일에서는 높이를 조금 더 줄임
        h = Math.min(Math.random() * 100 + 80, maxH);
    }

    let x;

    if (isHorizontal) {
        x = margin + Math.random() * Math.max(cw - w - margin * 2, 0);
    } else {
        let isLeft = topWall ? (topWall.x > cw / 2) : (Math.random() > 0.5);

        // 모바일 환경처럼 폭이 좁은 경우, 벽의 위치를 더 끝으로 몰아 중앙 돌파 공간 확보
        let spreadRatio = cw < 600 ? 0.05 : 0.1;

        if (isLeft) {
            x = margin + Math.random() * (cw * spreadRatio);
        } else {
            x = cw - margin - w - Math.random() * (cw * spreadRatio);
        }
    }

    let type = 'normal';
    let rand = Math.random();
    if (scoreMultiplier > 10) {
        if (rand < 0.15) type = 'bouncy';
        else if (rand < 0.4) type = 'fragile';
    }

    let gapY = isHorizontal ? (Math.random() * 40 + 40) : (Math.random() * 80 - 40);
    let currentY = topWall ? topWall.y - h - gapY : ch - 200;

    walls.push(new Wall(x, currentY, w, h, type));

    if (Math.random() < 0.06) {
        let orbX = cw / 2 + (Math.random() - 0.5) * 100;
        let orbY = currentY + h / 2;
        orbs.push(new Orb(orbX, orbY));
    }

    return currentY;
}

function initGame() {
    slime = new Slime();
    walls = [];
    particles = [];
    orbs = [];
    stars = [];
    score = 0;
    cameraY = 0;
    screenShake = 0;
    fog = { y: ch + 600, speed: 1.2, active: false };

    // 우주 배경 입자 초기화
    for (let i = 0; i < 40; i++) stars.push(new Star());

    walls.push(new Wall(0, ch - 50, cw, 100, 'normal'));

    let topWall = walls[0];
    for (let i = 0; i < 15; i++) {
        generateWall(topWall, i);
        topWall = walls[walls.length - 1];
    }

    scoreText.innerText = score;
    state = 'PLAYING';
    startScreen.style.opacity = '0';
    setTimeout(() => startScreen.classList.add('hidden'), 400);
    gameOverScreen.classList.add('hidden');
    gameOverScreen.style.opacity = '0';
}

function handleDown(e) {
    if (state !== 'PLAYING') return;
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    dragCurrent = { ...dragStart };
}

function handleMove(e) {
    if (!isDragging || state !== 'PLAYING') return;
    dragCurrent = { x: e.clientX, y: e.clientY };
}

function handleUp(e) {
    if (!isDragging || state !== 'PLAYING') return;
    isDragging = false;

    if (slime.canJump) {
        let dx = dragStart.x - dragCurrent.x;
        let dy = dragStart.y - dragCurrent.y;

        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
            fog.active = true;
            if (dist > MAX_DRAG_DIST) {
                dx = (dx / dist) * MAX_DRAG_DIST;
                dy = (dy / dist) * MAX_DRAG_DIST;
            }

            slime.vx = Math.max(Math.min(dx * SLING_POWER, MAX_SPEED), -MAX_SPEED);
            slime.vy = Math.max(Math.min(dy * SLING_POWER, MAX_SPEED), -MAX_SPEED);
            slime.canJump = false;
            slime.isSticking = false;
            slime.parachuteTimer = 0;
            slime.squishX = 0.5; slime.squishY = 1.5;

            // 도약 시 바닥/벽에서 스파크 튀기
            createParticles(slime.x, slime.y, 8, '#38bdf8');
        }
    }
}

canvas.addEventListener('pointerdown', handleDown);
window.addEventListener('pointermove', handleMove);
window.addEventListener('pointerup', handleUp);
window.addEventListener('pointercancel', handleUp);

function gameOver() {
    state = 'GAMEOVER';
    finalScore.innerText = Math.floor(score);
    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('slimeWallJumpHigh', highScore);
        highScoreText.innerText = highScore;
    }
    finalHighScore.innerText = highScore;
    gameOverScreen.classList.remove('hidden');
    // 부드러운 페이드 인
    setTimeout(() => gameOverScreen.style.opacity = '1', 10);
}

function update() {
    if (state !== 'PLAYING') return;

    slime.update();

    walls.forEach(w => w.update());
    walls = walls.filter(w => !w.isDestroyed);

    for (let i = orbs.length - 1; i >= 0; i--) {
        let o = orbs[i];
        o.update();
        let dx = slime.x - o.x;
        let dy = slime.y - o.y;
        if (Math.sqrt(dx * dx + dy * dy) < slime.radius + o.radius) {
            orbs.splice(i, 1);
            slime.vy = -MAX_SPEED * 1.5;
            slime.vx = 0;
            slime.canJump = true;
            slime.boostTimer = 40;
            screenShake = 15;
            createParticles(o.x, o.y, 40, '#facc15');
        }
    }

    if (slime.y < cameraY + ch * 0.4) {
        let diff = (cameraY + ch * 0.4) - slime.y;
        cameraY -= diff;

        let newScore = Math.floor(Math.abs(cameraY) / 10);
        if (newScore > score) {
            score = newScore;
            scoreText.innerText = score;
        }
    } else if (slime.y > cameraY + ch * 0.7) {
        let diff = slime.y - (cameraY + ch * 0.7);
        cameraY += diff;
        if (cameraY > 0) cameraY = 0;
    }

    if (fog.active) {
        fog.y -= fog.speed;
        fog.speed += 0.0007;
        if (fog.y > cameraY + ch + 1200) fog.y = cameraY + ch + 1200;
        if (slime.y > fog.y) gameOver();
    } else {
        fog.y = cameraY + ch + 600;
    }

    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);

    let topWall = walls[walls.length - 1];
    if (walls[0] && walls[0].y > cameraY + ch + 1500) {
        walls.shift();
    }
    if (topWall && topWall.y > cameraY - ch) {
        generateWall(topWall, score);
    }
    orbs = orbs.filter(o => o.y < cameraY + ch + 1500);

    if (screenShake > 0) screenShake *= 0.9;
    if (screenShake < 0.1) screenShake = 0;
}

function draw() {
    // 배경 그라데이션 (깊은 우주 느낌)
    let bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, '#020617'); // 딥 다크 블루
    bgGrad.addColorStop(1, '#0f172a'); // 슬레이트
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // 시차 별빛 배경 
    stars.forEach(star => star.draw(ctx, cameraY));

    ctx.save();

    let sx = (Math.random() - 0.5) * screenShake * 10;
    let sy = (Math.random() - 0.5) * screenShake * 10;
    ctx.translate(sx, sy - cameraY);

    // 네온 그리드 배경
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    let gridSize = 100;
    let startY = Math.floor(cameraY / gridSize) * gridSize;
    for (let i = 0; i < ch + gridSize * 2; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, startY + i);
        ctx.lineTo(cw, startY + i);
        ctx.stroke();
    }

    // 절대 양쪽 벽 테두리 렌더링
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, cameraY - ch * 2, WALL_EDGE_WIDTH, ch * 4);
    ctx.fillRect(cw - WALL_EDGE_WIDTH, cameraY - ch * 2, WALL_EDGE_WIDTH, ch * 4);

    let edgeGrad = ctx.createLinearGradient(0, 0, WALL_EDGE_WIDTH, 0);
    edgeGrad.addColorStop(0, '#1e293b');
    edgeGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, cameraY - ch * 2, WALL_EDGE_WIDTH, ch * 4);

    let edgeGradR = ctx.createLinearGradient(cw - WALL_EDGE_WIDTH, 0, cw, 0);
    edgeGradR.addColorStop(0, '#0f172a');
    edgeGradR.addColorStop(1, '#1e293b');
    ctx.fillStyle = edgeGradR;
    ctx.fillRect(cw - WALL_EDGE_WIDTH, cameraY - ch * 2, WALL_EDGE_WIDTH, ch * 4);

    // 하이라이트 라인
    ctx.fillStyle = '#475569';
    ctx.fillRect(WALL_EDGE_WIDTH - 2, cameraY - ch * 2, 2, ch * 4);
    ctx.fillRect(cw - WALL_EDGE_WIDTH, cameraY - ch * 2, 2, ch * 4);

    walls.forEach(w => w.draw(ctx));
    orbs.forEach(o => o.draw(ctx));
    particles.forEach(p => p.draw(ctx));

    // 조준선 (미래적인 점선 UI)
    if (isDragging && slime.canJump && state === 'PLAYING') {
        let dx = dragStart.x - dragCurrent.x;
        let dy = dragStart.y - dragCurrent.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            if (dist > MAX_DRAG_DIST) {
                dx = (dx / dist) * MAX_DRAG_DIST;
                dy = (dy / dist) * MAX_DRAG_DIST;
            }

            ctx.beginPath();
            ctx.moveTo(slime.x, slime.y);
            ctx.lineTo(slime.x + dx * 1.5, slime.y + dy * 1.5);

            ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)'; // Cyan
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 8]);
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(slime.x + dx * 1.5, slime.y + dy * 1.5, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#06b6d4';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    slime.draw(ctx);

    // 향상된 안개 (마젠타 딥 글로우)
    let fogGradient = ctx.createLinearGradient(0, fog.y - 150, 0, fog.y + 100);
    fogGradient.addColorStop(0, 'rgba(192, 38, 211, 0)'); // fuchsia
    fogGradient.addColorStop(0.3, 'rgba(134, 25, 143, 0.6)');
    fogGradient.addColorStop(1, 'rgba(74, 4, 78, 1)');

    ctx.fillStyle = fogGradient;
    ctx.fillRect(0, fog.y - 150, cw, ch + 500);

    ctx.fillStyle = 'rgba(232, 121, 249, 0.2)'; // 연한 파티클
    let time = Date.now() * 0.002;
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc((cw / 8) * i + Math.sin(time + i) * 40, fog.y - 40 + Math.cos(time + i) * 30, 50 + Math.random() * 30, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

// --- 모바일 터치 및 데스크탑 클릭 드래그 이벤트 (슬라임 점프 조작) ---
function handleStart(e) {
    if (state !== 'PLAYING' || !slime.canJump) return;
    isDragging = true;
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStart = { x: clientX, y: clientY };
    dragCurrent = { x: clientX, y: clientY };
}

function handleMove(e) {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault(); // 모바일 환경 스크롤 방지
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragCurrent = { x: clientX, y: clientY };
}

function handleEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    let dx = dragStart.x - dragCurrent.x;
    let dy = dragStart.y - dragCurrent.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    // 최소 드래그 거리 (5px)
    if (dist > 5) {
        if (dist > MAX_DRAG_DIST) {
            dx = (dx / dist) * MAX_DRAG_DIST;
            dy = (dy / dist) * MAX_DRAG_DIST;
        }

        slime.vx = dx * SLING_POWER;
        slime.vy = dy * SLING_POWER;
        slime.canJump = false;
        slime.isSticking = false;
        slime.stickTimer = 0;

        createParticles(slime.x, slime.y, 10, slime.color);
        screenShake = 3;
    }
}

canvas.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove, { passive: false });
window.addEventListener('mouseup', handleEnd);

canvas.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('touchmove', handleMove, { passive: false });
window.addEventListener('touchend', handleEnd);

slime = new Slime();
walls = [new Wall(0, ch - 50, cw, 100, 'normal')];
particles = [];
orbs = [];
stars = [];
for (let i = 0; i < 40; i++) stars.push(new Star());
fog = { y: ch + 600, speed: 1.2, active: false };

state = 'MENU';
gameLoop();