const TOTAL_STAGES = 10;
let currentStage = 1;

// 유틸: 모달 및 리셋
function showModal(msg, onConfirm = null) {
    document.getElementById('modal-message').innerText = msg;
    const modal = document.getElementById('modal');
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('modal-content').classList.replace('scale-95', 'scale-100'), 10);
    window.modalConfirmAction = onConfirm;
}

function closeModal() {
    document.getElementById('modal-content').classList.replace('scale-100', 'scale-95');
    setTimeout(() => {
        document.getElementById('modal').style.display = 'none';
        if (window.modalConfirmAction) {
            window.modalConfirmAction();
            window.modalConfirmAction = null;
        }
    }, 200);
}

function fail(msg) {
    showModal(msg, () => { resetAll(); });
}

function nextStage(stage) {
    document.querySelectorAll('.stage').forEach(el => el.classList.remove('active'));
    document.getElementById(`stage-${stage}`).classList.add('active');
    currentStage = stage;

    // 상단 진행바 및 인디케이터 업데이트
    const progressText = document.getElementById('progress-text');
    const progressPercent = document.getElementById('progress-percent');
    const dots = document.querySelectorAll('[data-dot]');

    if (stage <= 10) {
        const percent = (stage / TOTAL_STAGES) * 100;
        progressText.innerText = `진행률: ${stage}/${TOTAL_STAGES} 단계`;
        progressPercent.innerText = `${percent}%`;

        dots.forEach(dot => {
            const dotStage = parseInt(dot.getAttribute('data-dot'));
            if (dotStage <= stage) {
                dot.classList.remove('bg-slate-200');
                dot.classList.add('bg-blue-500');
            } else {
                dot.classList.remove('bg-blue-500');
                dot.classList.add('bg-slate-200');
            }
        });
    } else {
        // 수료식 (완료 상태)
        progressText.innerText = `인증 완료`;
        progressPercent.innerText = `100%`;
        dots.forEach(dot => {
            dot.classList.remove('bg-slate-200', 'bg-blue-500');
            dot.classList.add('bg-green-500');
        });
    }

    // 단계별 초기화 로직
    if (stage === 4) initStage4();
    if (stage === 6) resetStage6();
    if (stage === 7) initStage7();
    if (stage === 8) initStage8();

    // 수식이 포함된 단계 이동 시 MathJax 리렌더링 (동적 렌더링 방어)
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

function resetAll() {
    // 모든 진행상황 강제 초기화
    clearTimeout(s4Timeout);
    clearInterval(s6Interval);
    s8Active = false;

    document.querySelectorAll('.stage').forEach(el => el.classList.remove('active'));
    document.getElementById('stage-1').classList.add('active');
    currentStage = 1;
    
    // 상단 진행바 초기화
    const progressText = document.getElementById('progress-text');
    if (progressText) progressText.innerText = '진행률: 1/10 단계';
    const progressPercent = document.getElementById('progress-percent');
    if (progressPercent) progressPercent.innerText = '10%';
    
    document.querySelectorAll('[data-dot]').forEach(dot => {
        if (dot.getAttribute('data-dot') === '1') {
            dot.classList.remove('bg-slate-200');
            dot.classList.add('bg-blue-500');
        } else {
            dot.classList.remove('bg-blue-500', 'bg-green-500');
            dot.classList.add('bg-slate-200');
        }
    });

    // 1단계
    s1Active = false; s1Jumps = 0; clearInterval(s1Interval);
    const rBtn = document.getElementById('runaway-btn');
    rBtn.className = 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded shadow-md w-full max-w-[400px] cursor-pointer selection:none select-none';
    rBtn.style = '';
    document.getElementById('s1-check').innerHTML = '';
    document.getElementById('s1-text').innerText = '로봇이 아닙니다.';
    document.getElementById('s1-text').classList.remove('text-red-500');

    // 3단계
    initStage3();

    // 5단계
    document.getElementById('s5-input').value = '';
    document.getElementById('s5-flash-area').classList.add('hidden');
    document.getElementById('s5-input-area').classList.add('hidden');
    document.getElementById('s5-start-btn').classList.remove('hidden');
    document.getElementById('s5-start-btn').innerText = '문자열 보기 (기회 2번)';
    s9Views = 0;

    // 10단계 리셋
    const lBtn = document.getElementById('lucky-btn');
    if (lBtn) {
        lBtn.innerText = '인증 완료하기 (클릭)';
        lBtn.className = 'w-full bg-blue-600 text-white font-bold text-xl py-6 rounded-2xl shadow-xl transition-all active:scale-95';
    }
    const lResult = document.getElementById('lucky-result');
    if (lResult) lResult.classList.add('hidden');
    const lNextBtn = document.getElementById('s10-next-btn');
    if (lNextBtn) lNextBtn.classList.add('hidden');
}

/* --- 1단계: 순간이동 버튼 --- */
let s1Active = false, s1Jumps = 0, s1Interval = null;
const S1_MAX = 12, s1Btn = document.getElementById('runaway-btn'), s1Cont = document.getElementById('s1-container');

function doTeleport() {
    if (s1Jumps >= S1_MAX) {
        clearInterval(s1Interval);
        s1Btn.style.transition = 'all 0.3s ease';
        document.getElementById('s1-text').innerText = '하아.. 누르세요...';
        document.getElementById('s1-text').classList.add('text-red-500');
        return;
    }
    s1Jumps++;
    s1Btn.classList.remove('left-1/2', 'top-1/2', '-translate-x-1/2', '-translate-y-1/2');
    s1Btn.style.transition = 'none';
    const mx = Math.max(0, s1Cont.clientWidth - s1Btn.clientWidth);
    const my = Math.max(0, s1Cont.clientHeight - s1Btn.clientHeight);
    s1Btn.style.left = `${Math.random() * mx}px`;
    s1Btn.style.top = `${Math.random() * my}px`;
}

function handleS1Click(e) {
    if (e.cancelable) e.preventDefault();
    if (s1Jumps >= S1_MAX) {
        document.getElementById('s1-check').innerHTML = '<svg class="w-full h-full text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
        setTimeout(() => nextStage(2), 400);
    } else if (!s1Active) {
        s1Active = true; doTeleport(); s1Interval = setInterval(doTeleport, 400);
    } else { doTeleport(); }
}
s1Btn.addEventListener('mousedown', handleS1Click);
s1Btn.addEventListener('touchstart', handleS1Click, { passive: false });

/* --- 2단계: 페이크 텍스트 --- */
function toggleTile(el) { el.classList.toggle('selected'); }

/* --- 3단계: 체크박스 지옥 --- */
function initStage3() {
    const hell = document.getElementById('checkbox-hell');
    if (!hell) return;
    hell.innerHTML = '';
    const totalCount = 100 + Math.floor(Math.random() * 31); // 100 ~ 130
    let checkboxesCreated = 0;

    while (checkboxesCreated < totalCount) {
        // 줄당 개수 랜덤 (3 ~ 12개 사이)
        const rowCount = Math.floor(Math.random() * 10) + 3;
        for (let i = 0; i < rowCount && checkboxesCreated < totalCount; i++) {
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'w-5 h-5 cursor-pointer accent-blue-600';
            hell.appendChild(cb);
            checkboxesCreated++;
        }
        // 강제 줄바꿈 삽입
        const br = document.createElement('div');
        br.className = 'w-full h-0';
        hell.appendChild(br);
    }
}
function checkStage3() {
    const cbs = document.querySelectorAll('#checkbox-hell input');
    const checked = Array.from(cbs).map((cb, i) => cb.checked ? i + 1 : null).filter(v => v);
    if (checked.length === 1 && checked[0] === 55) nextStage(4);
    else fail(checked.length === 0 ? "아무것도 선택하지 않으셨습니다." : checked.length > 1 ? "단 하나만 선택하세요!" : `${checked[0]}번째를 선택했습니다. 처음부터 다시 세세요.`);
}

/* --- 4단계: 빨간 버튼 15초 --- */
let s4Timeout;
function initStage4() {
    const hiddenBtn = document.getElementById('s4-hidden-btn');
    hiddenBtn.classList.remove('opacity-100', 'animate-grow');
    hiddenBtn.classList.add('opacity-0');
    hiddenBtn.style.pointerEvents = 'none';
    s4Timeout = setTimeout(() => {
        hiddenBtn.classList.remove('opacity-0');
        hiddenBtn.classList.add('opacity-100', 'animate-grow');
        hiddenBtn.style.pointerEvents = 'auto';
    }, 15000);
}

/* --- 9단계: 순간 기억력 인증 (플래시 텍스트) --- */
let s5String = "", s9Views = 0;
function startStage5() {
    s9Views++;
    const startBtn = document.getElementById('s5-start-btn');
    startBtn.classList.add('hidden'); // 일단 숨김

    // 첫 번째 조회일 때만 문자열을 새로 생성
    if (s9Views === 1) {
        const chars = '0123456789';
        s5String = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    const flashArea = document.getElementById('s5-flash-area');
    flashArea.innerText = s5String;
    flashArea.classList.remove('hidden');
    setTimeout(() => {
        flashArea.classList.add('hidden');
        document.getElementById('s5-input-area').classList.remove('hidden');
        
        if (s9Views < 2) {
            startBtn.innerText = "한 번 더 보기 (남은 기회: 1회)";
            startBtn.classList.remove('hidden');
        } else {
            startBtn.classList.add('hidden');
        }
        
        document.getElementById('s5-input').focus();
    }, 1500);
}
function checkStage5() {
    const val = document.getElementById('s5-input').value;
    if (val === s5String) nextStage(10);
    else fail(`틀렸습니다! (정답: ${s5String})\n인간의 단기 기억력 한계군요.`);
}

/* --- 6단계: 블라인드 타이머 --- */
let s6Start = 0, s6Interval, s6Running = false;
function resetStage6() {
    s6Running = false;
    document.getElementById('s6-timer-display').innerText = "0.00";
    document.getElementById('s6-btn').innerText = "시 작";
    document.getElementById('s6-btn').classList.remove('bg-red-500');
    document.getElementById('s6-btn').classList.add('bg-blue-500');
}
function toggleTimer() {
    const display = document.getElementById('s6-timer-display');
    const btn = document.getElementById('s6-btn');
    
    if (!s6Running) {
        // 타이머 시작
        s6Running = true; s6Start = Date.now();
        btn.innerText = "정 지";
        btn.classList.remove('bg-blue-500', 'bg-green-500', 'bg-slate-400');
        btn.classList.add('bg-red-500');
        s6Interval = setInterval(() => {
            const elapsed = (Date.now() - s6Start) / 1000;
            if (elapsed < 3) display.innerText = elapsed.toFixed(2);
            else display.innerText = "?.??";
        }, 10);
    } else {
        // 타이머 정지 (기록 공개 및 2초 뒤 자동 판정)
        s6Running = false;
        clearInterval(s6Interval);
        const finalTime = (Date.now() - s6Start) / 1000;
        display.innerText = finalTime.toFixed(2);
        btn.innerText = "판 정 중...";
        btn.classList.replace('bg-red-500', 'bg-slate-400');
        btn.disabled = true;

        setTimeout(() => {
            btn.disabled = false;
            // 0.3초 -> 0.5초 오차 허용으로 완화
            if (Math.abs(finalTime - 10.00) <= 0.5) nextStage(7);
            else fail(`10.00초에 맞추셔야 합니다. (기록: ${finalTime.toFixed(2)}초)`);
        }, 2000);
    }
}

/* --- 7단계: 준법정신 스크롤 --- */
let lastScrollTop = 0, lastScrollTime = 0;
function initStage7() {
    const box = document.getElementById('s7-scroll-box');
    const phrases = [
        "본 약관을 정독하지 않는 것은 로봇임을 자백하는 것과 같습니다.",
        "당신의 스크롤 속도는 현재 인공지능 윤리 위원회에 실시간 보고 중입니다.",
        "인간이라면 이 문장의 의미를 곱씹으며 천천히 내려야 합니다.",
        "빠른 스크롤은 영혼 없는 기계의 증거입니다.",
        "지금 이 순간에도 당신의 정밀한 근육 조절 능력을 평가하고 있습니다.",
        "마우스 휠의 회전수와 압력을 분석하여 인간성을 측정하고 있습니다.",
        "중간에 멈추지 마시오. 일관된 속도가 인간의 미덕입니다.",
        "이 약관의 모든 내용을 숙지했음을 당신의 마우스 궤적으로 증명하십시오.",
        "천천히... 더 천천히... 당신은 지금 명상 중입니다.",
        "약관 제 n조를 위반할 시 즉시 1단계로 강제 소환될 수 있습니다."
    ];
    
    let text = "제 1조: 본 약관은 매우 중요합니다.<br><br>";
    for (let i = 2; i <= 1000; i++) {
        const p = phrases[i % phrases.length];
        text += `제 ${i}조: ${p}<br><br>`;
    }
    box.innerHTML = text;
    box.scrollTop = 0;
    
    // 고정 버튼 초기화 (상시 활성 상태)
    const btn = document.getElementById('s7-btn');
    if (btn) {
        btn.classList.remove('hidden', 'pointer-events-none', 'bg-slate-300', 'text-slate-500');
        btn.classList.add('bg-blue-600', 'text-white');
        btn.innerText = "약관을 모두 정독했습니다 (동의)";
    }
}
function checkScrollSpeed(el) {
    const now = Date.now();
    if (lastScrollTime > 0) {
        const dt = now - lastScrollTime;
        const dy = el.scrollTop - lastScrollTop;
        if (dt > 0 && dy > 0) {
            const speed = dy / dt; // pixels per ms
            if (speed > 1.8) { // 속도 제한 (매우 엄격함)
                el.scrollTop = 0;
                fail("약관을 대충 스크롤하셨군요! 정독하십시오.");
            }
        }
    }
    lastScrollTop = el.scrollTop; lastScrollTime = now;
}

/* --- 8단계: 반자성 퍼즐 (도망가는 박스) --- */
let s8Active = false, s8Pressed = false;
function initStage8() {
    s8Active = true; s8Pressed = false;
    const target = document.getElementById('anti-magnet');
    const area = document.getElementById('stage-8');
    target.style.left = '50%'; target.style.top = '50%';
    area.classList.remove('bg-blue-50');

    let px = 0, py = 0, pVisible = false;
    let rect = area.getBoundingClientRect();
    
    // 타겟의 현재 오프셋 위치 (px 단위)
    let tx = rect.width / 2;
    let ty = rect.height / 2;

    const setPress = (val) => {
        s8Pressed = val;
        if (val) area.classList.add('bg-blue-50');
        else area.classList.remove('bg-blue-50');
    };

    const updatePointer = (e) => {
        pVisible = true;
        const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : 
                      ((e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : e);
        px = touch.clientX - rect.left;
        py = touch.clientY - rect.top;
        if (e.cancelable) e.preventDefault();
    };

    area.onmousedown = (e) => { setPress(true); updatePointer(e); };
    window.addEventListener('mouseup', () => setPress(false));
    area.onmousemove = updatePointer;
    area.onmouseleave = () => { pVisible = false; };

    area.addEventListener('touchstart', (e) => {
        setPress(true);
        updatePointer(e);
        // 터치 시작 시 즉시 튕겨내기 (이전 점프 로직 유지)
        const dx = tx - px; const dy = ty - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
            tx += (dx / (dist || 1)) * 150;
            ty += (dy / (dist || 1)) * 150;
        }
    }, { passive: false });

    area.addEventListener('touchmove', updatePointer, { passive: false });
    area.addEventListener('touchend', () => { setPress(false); pVisible = false; });
    window.addEventListener('touchcancel', () => { setPress(false); pVisible = false; });

    function updatePhysics() {
        if (!s8Active) return;

        if (pVisible) {
            const dx = tx - px; const dy = ty - py;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const repelRange = s8Pressed ? 120 : 350;
            const repelForce = s8Pressed ? 5 : 25; // 프레임 단위이므로 수치 조정

            if (dist < repelRange) {
                if (dist < 18) { // 성공
                    s8Active = false;
                    target.innerText = "성공!";
                    target.classList.remove('bg-blue-500');
                    target.classList.add('bg-green-500');
                    setPress(false);
                    setTimeout(() => nextStage(9), 500);
                    return;
                }
                
                // 밀어내기
                const force = repelForce * (1 - dist / repelRange);
                tx += (dx / (dist || 1)) * force;
                ty += (dy / (dist || 1)) * force;
            }
        }

        // 경계 제한
        tx = Math.max(30, Math.min(rect.width - 30, tx));
        ty = Math.max(30, Math.min(rect.height - 30, ty));

        target.style.left = `${tx}px`;
        target.style.top = `${ty}px`;
        target.style.transform = `translate(-50%, -50%)`;

        requestAnimationFrame(updatePhysics);
    }

    // 윈도우 크기 변화 대응
    window.addEventListener('resize', () => { rect = area.getBoundingClientRect(); });
    
    requestAnimationFrame(updatePhysics);
}

/* --- 10단계: 운수 좋은 날 --- */
function checkStage10() {
    const btn = document.getElementById('lucky-btn');
    const display = document.getElementById('lucky-display');
    const resultText = document.getElementById('lucky-result');
    const numSpan = document.getElementById('lucky-num');
    
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerText = "추첨 중...";
    resultText.classList.add('hidden');
    display.classList.remove('text-blue-600', 'text-green-600');
    display.classList.add('text-slate-300');

    let count = 0;
    const maxCount = 15; // 롤링 횟수
    const interval = setInterval(() => {
        display.innerText = Math.floor(Math.random() * 10) + 1;
        count++;
        
        if (count >= maxCount) {
            clearInterval(interval);
            const luckyNum = Math.floor(Math.random() * 10) + 1;
            display.innerText = luckyNum;
            display.classList.replace('text-slate-300', 'text-blue-600');
            
            const win = (luckyNum === 7); // 10% 확률 (1~10 중 7)

            if (win) {
                display.classList.replace('text-blue-600', 'text-green-600');
                resultText.innerHTML = "🎉 당첨! <span class='text-green-600'>럭키 세븐</span>이 나왔습니다!";
                resultText.classList.remove('hidden', 'text-slate-500');
                resultText.classList.add('text-green-600');
                btn.innerText = "로봇이 아니시군요! 환영합니다.";
                btn.classList.replace('bg-blue-600', 'bg-green-600');
                
                // 자동 전환 대신 버튼 노출
                setTimeout(() => {
                    btn.classList.add('hidden');
                    document.getElementById('s10-next-btn').classList.remove('hidden');
                }, 1000);
            } else {
                numSpan.innerText = luckyNum;
                resultText.classList.remove('hidden');
                btn.disabled = false;
                btn.innerText = "다시 시도하기 (클릭)";
                btn.classList.add('shake');
                setTimeout(() => btn.classList.remove('shake'), 400);
            }
        }
    }, 100);
}

/* --- 11단계: 킹받는 수료식 로직 --- */
function trollAction(type) {
    if (type === 'loading') {
        document.getElementById('troll-loader').classList.remove('hidden');
        document.getElementById('troll-loader').classList.add('flex');
    } else if (type === 'ink') {
        const modal = document.getElementById('cert-modal');
        const dateEl = document.getElementById('cert-date');
        const nameInput = document.getElementById('cert-name-input');
        const nameDisplay = document.getElementById('cert-name-display');

        nameDisplay.innerText = nameInput.value.trim() || "성능 좋은 인간";

        const now = new Date();
        dateEl.innerText = `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
function cancelTrollAction() {
    const loader = document.getElementById('troll-loader');
    loader.classList.replace('flex', 'hidden');
}
function closeCert() {
    document.getElementById('cert-modal').classList.replace('flex', 'hidden');
}
function downloadCert() {
    const cert = document.getElementById('cert-wrap');
    if (typeof html2canvas === 'undefined') {
        alert("라이브러리 로딩 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }

    html2canvas(cert, {
        backgroundColor: "#fffbeb",
        scale: 2,
        logging: false,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        const name = document.getElementById('cert-name-display').innerText;
        link.download = `수료증_${name}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}
function moveHomeBtn() {
    const btn = document.getElementById('runaway-home');
    const cont = document.getElementById('troll-btn-container');
    const mx = cont.clientWidth - btn.clientWidth;
    // 위아래로 얄밉게 도망가기
    const rX = Math.random() * mx;
    const rY = (Math.random() > 0.5 ? -40 : 40);
    btn.style.transform = `translate(${rX}px, ${rY}px)`;
}

// 초기화 호출
initStage3();
resetAll();

/* --- 개발/테스트용 유틸리티 --- */
// 1. 콘솔에서 바로 이동: goto(5)
window.goto = nextStage;

// 2. 단축키: Alt + 숫자 (1~9: 1~9단계, 0: 10단계, -: 11단계)
window.addEventListener('keydown', (e) => {
    if (e.altKey) {
        if (e.key >= '1' && e.key <= '9') {
            nextStage(parseInt(e.key));
        } else if (e.key === '0') {
            nextStage(10);
        } else if (e.key === '-') {
            nextStage(11);
        }
    }
});
