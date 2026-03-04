// 모달 관리 함수
function showModal(msg) {
    document.getElementById('modal-msg').innerText = msg;
    document.getElementById('custom-modal').classList.remove('hidden');
}
function closeModal() {
    document.getElementById('custom-modal').classList.add('hidden');
}

// 실제 브라우저 에러(iframe 샌드박스 제한 등)를 방지하기 위한 가짜 새로고침
function fakeReload() {
    document.body.style.transition = 'opacity 0.2s';
    document.body.style.opacity = '0';

    setTimeout(() => {
        // 1. 모든 입력 폼 초기화
        document.querySelectorAll('input').forEach(input => {
            if (input.type === 'checkbox') input.checked = true;
            else if (input.type === 'range') {
                input.value = 12345678;
                document.getElementById('phone-display').innerText = '010-1234-5678';
            }
            else input.value = '';
        });

        // 2. 모달 및 추가 UI 초기화
        closeModal();
        document.getElementById('verify-area').classList.add('hidden');

        // 3. 벌레들 모두 청소
        document.querySelectorAll('.bug-element').forEach(el => el.remove());

        // 4. 도망가는 버튼 원위치
        const runawayBtn = document.getElementById('runaway-btn');
        runawayBtn.style.position = '';
        runawayBtn.style.left = '';
        runawayBtn.style.top = '';
        runawayBtn.style.transform = '';
        if (typeof isRunawayActive !== 'undefined') isRunawayActive = false;

        // 5. 화면 복구
        document.body.style.opacity = '1';
        setTimeout(() => { document.body.style.transition = ''; }, 200);
    }, 300);
}

// 0. 이름 입력창 역순 로직 (한글 IME 완벽 지원)
const nameInput = document.getElementById('name-input');
let isReversing = false;
let isComposing = false; // 한글 조합 상태 추적

// 한글 자음/모음 조합이 시작될 때
nameInput.addEventListener('compositionstart', () => {
    isComposing = true;
});

// 한글 한 글자 조합이 끝났을 때
nameInput.addEventListener('compositionend', () => {
    isComposing = false;
    applyReverse();
});

// 일반 입력 (영어, 숫자, 띄어쓰기 등) 또는 한글 조합 중
nameInput.addEventListener('input', function (e) {
    // 한글 조합 중일 때는 자음/모음이 분리되지 않도록 건드리지 않음
    if (isComposing) return;
    applyReverse();
});

function applyReverse() {
    if (isReversing) return;
    isReversing = true;

    // 입력된 문자열을 뒤집어버림
    const reversed = nameInput.value.split('').reverse().join('');
    nameInput.value = reversed;

    // 커서를 강제로 맨 뒤로 보냄
    setTimeout(() => {
        nameInput.selectionStart = nameInput.selectionEnd = nameInput.value.length;
        isReversing = false;
    }, 0);
}

// 1. 생년월일 룰렛 로직
const runRoulette = (elementId, btnId, min, max, speed) => {
    const el = document.getElementById(elementId);
    const btn = document.getElementById(btnId);
    let interval;
    let isRunning = true;
    let currentVal = min;

    const updateDisplay = () => {
        el.innerText = elementId === 'roulette-year' ? currentVal : String(currentVal).padStart(2, '0');
    };

    const start = () => {
        isRunning = true;
        btn.innerText = "STOP";
        btn.classList.remove('bg-red-500', 'hover:bg-red-600');
        btn.classList.add('bg-teal-500', 'hover:bg-teal-600');
        interval = setInterval(() => {
            currentVal++;
            if (currentVal > max) currentVal = min;
            updateDisplay();
        }, speed);
    };

    const stop = () => {
        isRunning = false;
        clearInterval(interval);
        btn.innerText = "다시 굴리기";
        btn.classList.remove('bg-teal-500', 'hover:bg-teal-600');
        btn.classList.add('bg-red-500', 'hover:bg-red-600');

        // 15% 확률로 브레이크가 밀려서 1~2칸 더 가버림 (킹받는 포인트)
        if (Math.random() < 0.15) {
            setTimeout(() => {
                const slip = Math.floor(Math.random() * 2) + 1; // 1 or 2칸 미끄러짐
                currentVal += slip;
                if (currentVal > max) currentVal = min + (currentVal - max - 1);
                updateDisplay();
                showModal('기계가 낡아서 브레이크가 조금 밀렸습니다! 다시 시도해보세요.');
            }, 400);
        }
    };

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isRunning) stop();
        else start();
    });

    // 초기 실행
    start();
};

// 속도 설정: 연도(초고속), 월(약간 빠름), 일(보통)
runRoulette('roulette-year', 'btn-year', 1900, 2026, 20);
runRoulette('roulette-month', 'btn-month', 1, 12, 60);
runRoulette('roulette-day', 'btn-day', 1, 31, 35);

// 2. 전화번호 슬라이더 로직
const phoneSlider = document.getElementById('phone-slider');
const phoneDisplay = document.getElementById('phone-display');
phoneSlider.addEventListener('input', function () {
    // 8자리 숫자로 포맷팅
    const numStr = String(this.value).padStart(8, '0');
    const formatted = `010-${numStr.slice(0, 4)}-${numStr.slice(4, 8)}`;
    phoneDisplay.innerText = formatted;
});

// 1-1. 킹받는 인증번호 전송 로직
const sendCodeBtn = document.getElementById('send-code-btn');
const verifyArea = document.getElementById('verify-area');
const codeMsg = document.getElementById('code-msg');
let bombTimer;

sendCodeBtn.addEventListener('click', () => {
    const currentPhone = phoneDisplay.innerText;
    const randomCode = Math.floor(100000 + Math.random() * 900000); // 6자리 랜덤 난수 생성

    verifyArea.classList.remove('hidden');

    codeMsg.innerHTML = `안내: <b>${currentPhone}</b> 번호로 인증번호 <span id="the-code" class="text-2xl text-blue-700 font-black bg-yellow-300 px-2 py-1 tracking-[0.5em]">[${randomCode}]</span> 를 발송했습니다.<br><span class="text-red-600 text-xs">⚠️ 최고 수준의 보안을 위해 인증번호는 <b>1.5초 뒤</b> 영구 삭제됩니다.</span>`;

    // 1.5초 뒤에 펑 터지는 타이머
    clearTimeout(bombTimer);
    bombTimer = setTimeout(() => {
        const theCode = document.getElementById('the-code');
        if (theCode) {
            theCode.innerText = '[💣펑! 기억 못하셨나요?]';
            theCode.classList.remove('text-blue-700', 'tracking-[0.5em]', 'text-2xl', 'bg-yellow-300');
            theCode.classList.add('text-red-600', 'text-sm');
        }
    }, 1500);
});

// 2. 비밀번호 랜덤 초기화 로직
const passwordInput = document.getElementById('password-input');
passwordInput.addEventListener('input', function (e) {
    // 15% 확률로 입력한 내용이 싹 날아감
    if (Math.random() < 0.15) {
        this.value = '';
        showModal('타이핑 리듬이 불규칙하여 해킹 시도로 간주됩니다. 초기화합니다.');
    }
});

// 4. 불가능한 그림 캡챠 로직
const captchaInput = document.getElementById('captcha-input');
captchaInput.addEventListener('change', function () {
    if (this.value !== "") {
        setTimeout(() => {
            this.value = '';
            showModal('그림과 전혀 다릅니다. 선의 굵기, 색상, 그리고 곡선의 질감까지 키보드로 완벽하게 타이핑해 주세요.');
        }, 500);
    }
});

// 3.5. 마케팅 수신 동의 좀벌레 로직
const marketingChk = document.getElementById('marketing-chk');

// 체크 박스 꼼수 무효화
marketingChk.addEventListener('click', (e) => {
    e.preventDefault(); // 체크 상태 변경을 원천 차단
    showModal('이미 당신의 이메일은 저희 것입니다. 해제할 수 없습니다.');
});

// 체크박스에 마우스가 다가가면 미세하게 꿈틀거림
const wiggleCheckbox = (e) => {
    if (e.type === 'touchstart') e.preventDefault();
    const randomX = Math.floor(Math.random() * 60);
    const randomY = Math.floor(Math.random() * 20) - 10;
    marketingChk.style.transform = `translate(${randomX}px, ${randomY}px)`;
};

marketingChk.addEventListener('mouseenter', wiggleCheckbox);
marketingChk.addEventListener('touchstart', wiggleCheckbox, { passive: false });

// 4. 거절 버튼 위치 바꾸기 로직 (모바일 터치 지원)
const btnNo = document.getElementById('btn-no');
const btnYes = document.getElementById('btn-yes');
const buttonGroup = document.getElementById('button-group');

const swapTermsButtons = (e) => {
    if (e && e.type === 'touchstart') e.preventDefault(); // 모바일 터치 시 클릭되는 것을 방지
    // 거절 버튼에 마우스를 올리거나 터치하려고 하면 동의 버튼과 순서가 바뀜
    if (btnYes.nextElementSibling === btnNo) {
        buttonGroup.insertBefore(btnNo, btnYes);
    } else {
        buttonGroup.insertBefore(btnYes, btnNo);
    }
};

btnNo.addEventListener('mouseenter', swapTermsButtons);
btnNo.addEventListener('touchstart', swapTermsButtons, { passive: false });

// 동의 버튼 클릭 시 킹받는 메시지
btnYes.addEventListener('click', () => {
    showModal('탁월한 선택입니다! 귀하의 데이터는 안전하게(?) 보관됩니다.');
});

// 5. 도망가는 가입 완료 버튼 로직 (모바일 터치 지원)
const runawayBtn = document.getElementById('runaway-btn');
let isRunawayActive = false;
let isCoolingDown = false;

// 버튼이 도망가는 공통 로직
const moveRunawayBtn = () => {
    if (!isRunawayActive) {
        isRunawayActive = true;
        runawayBtn.style.position = 'fixed';
        runawayBtn.style.transform = 'none';
    }

    const btnRect = runawayBtn.getBoundingClientRect();
    // 화면(뷰포트) 안에서만 놀도록 최대 X, Y 계산
    const maxX = window.innerWidth - btnRect.width;
    const maxY = window.innerHeight - btnRect.height;

    // 화면 가장자리에 너무 바짝 붙지 않도록 10px 안전 여백
    const safeMaxX = Math.max(10, maxX - 10);
    const safeMaxY = Math.max(10, maxY - 10);

    runawayBtn.style.left = `${Math.floor(Math.random() * safeMaxX)}px`;
    runawayBtn.style.top = `${Math.floor(Math.random() * safeMaxY)}px`;
};

// PC 환경: 마우스가 근처로 다가오면 도망감
document.addEventListener('mousemove', (e) => {
    if (isCoolingDown) return;

    const btnRect = runawayBtn.getBoundingClientRect();
    const btnCenterX = btnRect.left + btnRect.width / 2;
    const btnCenterY = btnRect.top + btnRect.height / 2;
    const distance = Math.hypot(e.clientX - btnCenterX, e.clientY - btnCenterY);

    if (distance < 150) {
        moveRunawayBtn();
        isCoolingDown = true;
        setTimeout(() => { isCoolingDown = false; }, 200);
    }
});

// 모바일 환경: 손가락을 화면에 댄 채로 근처로 스와이프하면 도망감
document.addEventListener('touchmove', (e) => {
    if (isCoolingDown) return;

    const touch = e.touches[0];
    const btnRect = runawayBtn.getBoundingClientRect();
    const btnCenterX = btnRect.left + btnRect.width / 2;
    const btnCenterY = btnRect.top + btnRect.height / 2;
    const distance = Math.hypot(touch.clientX - btnCenterX, touch.clientY - btnCenterY);

    if (distance < 150) {
        moveRunawayBtn();
        isCoolingDown = true;
        setTimeout(() => { isCoolingDown = false; }, 200);
    }
});

// 엄청난 속도로 마우스를 움직이거나 터치(탭) 했을 때를 대비한 직접적인 방어선
runawayBtn.addEventListener('mouseenter', moveRunawayBtn);
runawayBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); // 터치(탭)가 클릭으로 이어지는 것을 완전히 차단!
    moveRunawayBtn();
}, { passive: false });

// 탭(Tab) 키 꼼수와 마우스 클릭을 구분하는 최종 관문
runawayBtn.addEventListener('click', (e) => {
    // e.detail이 0이거나 pointerType이 없으면 키보드(Tab -> Enter/Space)로 실행한 것
    if (e.detail === 0 || !e.pointerType) {
        showModal('오... 탭(Tab) 키로 포커스를 잡고 엔터를 치셨군요? 제법 똑똑하지만 어림없습니다. (키보드 꼼수 감지됨)');
    } else {
        // 마우스나 터치로 정말 기적적으로 클릭한 경우
        showModal('가입시켜주기 단1%도 싫습니다.');
    }

    // 희망을 꺾어버리고 3초 뒤 새로고침 (가짜 새로고침으로 변경)
    setTimeout(() => { fakeReload(); }, 3000);
});

// 6. 사방에서 기어나오는 바퀴벌레 로직
function spawnRoach() {
    const roach = document.createElement('div');
    // 리얼리티를 살린 징그러운 바퀴벌레 SVG
    roach.innerHTML = `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
        <!-- 몸통 -->
        <ellipse cx="50" cy="50" rx="15" ry="30" fill="#4a2e15" />
        <ellipse cx="50" cy="30" rx="12" ry="10" fill="#2a1000" />
        <!-- 더듬이 -->
        <path d="M 45 20 C 30 0, 10 10, 5 20" stroke="#2a1000" stroke-width="2" fill="none" />
        <path d="M 55 20 C 70 0, 90 10, 95 20" stroke="#2a1000" stroke-width="2" fill="none" />
        <!-- 다리 -->
        <path d="M 35 40 L 15 30 L 5 40 M 35 50 L 10 50 L 5 60 M 35 60 L 15 75 L 10 85" stroke="#4a2e15" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M 65 40 L 85 30 L 95 40 M 65 50 L 90 50 L 95 60 M 65 60 L 85 75 L 90 85" stroke="#4a2e15" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
    roach.style.position = 'fixed';
    const size = Math.random() * 20 + 30; // 30~50px 랜덤 크기
    roach.style.width = size + 'px';
    roach.style.height = size + 'px';
    roach.style.zIndex = '9998'; // 가짜 머리카락(9999) 바로 밑
    roach.style.pointerEvents = 'auto'; // 클릭을 위해 auto로 변경

    // 파리채 커서 적용 (마우스가 올라가면 무조건 치고 싶게 만듦)
    const swatterCursor = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g transform='rotate(-45 20 20)'><rect x='10' y='5' width='20' height='15' rx='2' fill='rgba(255,0,0,0.2)' stroke='%23ff0000' stroke-width='2'/><path d='M15 5 v15 M25 5 v15 M10 10 h20 M10 15 h20' stroke='%23ff0000' stroke-width='1'/><line x1='20' y1='20' x2='20' y2='38' stroke='%238b4513' stroke-width='4' stroke-linecap='round'/></g></svg>";
    roach.style.cursor = `url("${swatterCursor}") 10 10, crosshair`;

    roach.classList.add('bug-element'); // 초기화 시 제거를 위한 클래스

    const speed = Math.random() * 2000 + 1500; // 1.5초 ~ 3.5초의 미친 속도
    roach.style.transition = `top ${speed}ms linear, left ${speed}ms linear`;

    // 화면 밖 4면 중 랜덤한 곳에서 스폰
    const startEdge = Math.floor(Math.random() * 4);
    let startX, startY, endX, endY;

    if (startEdge === 0) { // Top -> Bottom
        startX = Math.random() * window.innerWidth; startY = -100;
        endX = Math.random() * window.innerWidth; endY = window.innerHeight + 100;
    } else if (startEdge === 1) { // Right -> Left
        startX = window.innerWidth + 100; startY = Math.random() * window.innerHeight;
        endX = -100; endY = Math.random() * window.innerHeight;
    } else if (startEdge === 2) { // Bottom -> Top
        startX = Math.random() * window.innerWidth; startY = window.innerHeight + 100;
        endX = Math.random() * window.innerWidth; endY = -100;
    } else { // Left -> Right
        startX = -100; startY = Math.random() * window.innerHeight;
        endX = window.innerWidth + 100; endY = Math.random() * window.innerHeight;
    }

    roach.style.left = startX + 'px';
    roach.style.top = startY + 'px';

    // 이동 방향(각도) 계산 후 진행 방향으로 머리 돌리기 (기본 SVG가 위를 향하므로 +90도)
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

    document.body.appendChild(roach);

    // 파르르 떠는 몸통 애니메이션 (Wiggle)
    let wiggleState = 0;
    const wiggleInterval = setInterval(() => {
        wiggleState = !wiggleState;
        const wiggleAngle = wiggleState ? 10 : -10;
        roach.style.transform = `rotate(${angle + 90 + wiggleAngle}deg)`;
    }, 30); // 30ms마다 각도를 틀어서 진짜 곤충이 걷는 듯한 불쾌감 조성

    // 바퀴벌레 클릭(퇴치) 시 거미 소환 로직
    const killRoach = (e) => {
        e.preventDefault();
        const rect = roach.getBoundingClientRect();
        const clickX = rect.left + rect.width / 2;
        const clickY = rect.top + rect.height / 2;

        clearInterval(wiggleInterval);
        roach.remove(); // 바퀴벌레 터짐

        spawnSpider(clickX, clickY);
    };
    roach.addEventListener('mousedown', killRoach);
    roach.addEventListener('touchstart', killRoach, { passive: false });

    // DOM 업데이트 후 목표 위치로 이동
    setTimeout(() => {
        roach.style.left = endX + 'px';
        roach.style.top = endY + 'px';
    }, 50);

    // 목적지에 도착하면 DOM에서 제거하고 인터벌 초기화
    setTimeout(() => {
        clearInterval(wiggleInterval);
        roach.remove();
    }, speed + 100);

    // 1~4초마다 한 마리씩 무한 스폰 (점점 화면에 벌레가 많아짐)
    setTimeout(spawnRoach, Math.random() * 3000 + 1000);
}

// 7. 왕거미 점프스케어 로직 (바퀴벌레를 눌렀을 때)
function spawnSpider(startX, startY) {
    const spider = document.createElement('div');
    spider.innerHTML = `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
        <!-- 몸통 -->
        <circle cx="50" cy="60" r="15" fill="#111" />
        <circle cx="50" cy="40" r="12" fill="#222" />
        <!-- 털 (징그러운 디테일) -->
        <path d="M 35 60 L 30 65 M 65 60 L 70 65 M 40 70 L 38 78 M 60 70 L 62 78" stroke="#000" stroke-width="1"/>
        <!-- 다리 8개 -->
        <path d="M 38 40 Q 10 10 5 30 M 38 45 Q 5 45 5 60 M 38 50 Q 5 75 10 90 M 42 55 Q 20 90 30 95" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M 62 40 Q 90 10 95 30 M 62 45 Q 95 45 95 60 M 62 50 Q 95 75 90 90 M 58 55 Q 80 90 70 95" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
        <!-- 붉은 눈 4개 -->
        <circle cx="45" cy="38" r="2.5" fill="red" />
        <circle cx="55" cy="38" r="2.5" fill="red" />
        <circle cx="40" cy="40" r="1.5" fill="red" />
        <circle cx="60" cy="40" r="1.5" fill="red" />
    </svg>`;
    spider.style.position = 'fixed';
    spider.style.left = startX + 'px';
    spider.style.top = startY + 'px';
    spider.style.width = '30px';
    spider.style.height = '30px';
    spider.style.zIndex = '10000'; // 최상단 레이어
    spider.style.transform = 'translate(-50%, -50%) scale(1)';
    // 튀어오르는 듯한 역동적인 애니메이션 타이밍
    spider.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    spider.style.pointerEvents = 'none';
    spider.classList.add('bug-element'); // 초기화 시 제거를 위한 클래스

    document.body.appendChild(spider);

    // 0.05초 뒤 화면 정중앙으로 날아오며 거대해짐
    setTimeout(() => {
        spider.style.left = '50vw';
        spider.style.top = '50vh';
        spider.style.transform = 'translate(-50%, -50%) scale(30)'; // 30배 확대 (점프스케어)
    }, 50);

    // 거미가 날아온 후 어이없는 가스라이팅 모달 띄우고 강제 초기화
    setTimeout(() => {
        showModal('자연을 훼손하지 마세요! 생명은 소중합니다. (동물보호법 위반으로 가입 진행 내역이 초기화됩니다.)');
        setTimeout(() => { fakeReload(); }, 5000); // 읽을 수 있게 5초로 연장
    }, 600);
}

// 페이지 로드 1초 후 첫 벌레 등장
setTimeout(spawnRoach, 1000);
