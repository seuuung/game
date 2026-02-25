let gameState = 'BOOT_MENU';
let currentUser = 'guest';
let currentPath = ['home', 'guest'];
let history = [];
let historyIndex = -1;
let awaitingPasswordFor = null;
let hintLevel = 0;

let scenarioId;
let scenarioData = {};
let fileSystem = {};

function initBootMenu() {
    gameState = 'BOOT_MENU';
    outputDiv.innerHTML = '';
    print("GNU GRUB  version 2.06 - HARDCORE CTF EDTION", "system");
    print("-----------------------------------------", "system");
    print("시스템 복구 시나리오를 선택하세요:", "system");
    print("  [1] 튜토리얼 1: 숨겨진 파일 찾기 (기초 이동 및 탐색)");
    print("  [2] 튜토리얼 2: 권한과 비밀번호 (권한 탈취 기초)");
    print("  [3] 시나리오 1: 다중 암호화 해독 (ROT13 + Base64)");
    print("  [4] 시나리오 2: 해시 크래킹 및 단어 사전 (Wordlist + Salt)");
    print("  [5] 시나리오 3: 원격 API 침투 및 JWT 위조 (JWT Forgery)");
    print("  [6] 시나리오 4: SUID 버퍼 오버플로우 (Buffer Overflow)");
    print("  [7] 랜덤 시나리오 배정 (Random Scenario)");
    print("-----------------------------------------", "system");
    print("💡 처음이라면 1번부터 차근차근 시작하는 것을 권장합니다.", "success");
    promptSpan.innerHTML = "선택 (1-7): ";
    cmdInput.type = 'text';
    promptSpan.style.display = 'inline';
}

// ROT13 암호화/복호화 (알파벳만 변환)
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function (c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function loadScenario(id) {
    scenarioId = id;
    if (scenarioId === 7) scenarioId = Math.floor(Math.random() * 6) + 1;
    gameState = 'PLAYING';
    scenarioData = {};
    hintLevel = 0;
    currentUser = 'guest';
    currentPath = ['home', 'guest'];
    history = [];
    historyIndex = -1;
    awaitingPasswordFor = null;

    outputDiv.innerHTML = '';

    // 기본 파일 시스템
    fileSystem = {
        _type: "dir", perms: "drwxr-xr-x", owner: "root",
        "bin": { _type: "dir", perms: "drwxr-xr-x", owner: "root" },
        "sbin": {
            _type: "dir", perms: "drwxr-xr-x", owner: "root",
            "sys_unlock": {
                _type: "exec", perms: "-rwxr-xr-x", owner: "root", size: "112K", date: "Oct 24 00:01",
                fn: function (args) {
                    if (currentUser === 'admin' || currentUser === 'root') {
                        winGame("Admin privileges verified. Core system unlocked.");
                        return { out: "", err: false, success: true };
                    } else {
                        return { out: "sys_unlock: Permission denied. You must be 'admin' or 'root'.", err: true };
                    }
                }
            }
        },
        "etc": { _type: "dir", perms: "drwxr-xr-x", owner: "root" },
        "var": {
            _type: "dir", perms: "drwxr-xr-x", owner: "root",
            "backups": { _type: "dir", perms: "drwxr-xr-x", owner: "root" },
            "log": {
                _type: "dir", perms: "drwxr-xr-x", owner: "root",
                "syslog": { _type: "file", perms: "-rw-r--r--", owner: "root", content: "Kernel boot... OK\nNetwork module... OK", size: "120K", date: "Today 01:00" },
                "auth.log": { _type: "file", perms: "-rw-r--r--", owner: "root", content: "Failed password for root from 192.168.0.5\n", size: "50K", date: "Today 05:22" }
            }
        },
        "tmp": { _type: "dir", perms: "drwxrwxrwt", owner: "root" },
        "opt": { _type: "dir", perms: "drwxr-xr-x", owner: "root" },
        "usr": {
            _type: "dir", perms: "drwxr-xr-x", owner: "root",
            "share": {
                _type: "dir", perms: "drwxr-xr-x", owner: "root",
                "wordlists": { _type: "dir", perms: "drwxr-xr-x", owner: "root" }
            },
            "bin": { _type: "dir", perms: "drwxr-xr-x", owner: "root" }
        },
        "home": {
            _type: "dir", perms: "drwxr-xr-x", owner: "root",
            "guest": {
                _type: "dir", perms: "drwxr-xr-x", owner: "guest",
                ".bash_history": { _type: "file", perms: "-rw-------", owner: "guest", content: "ls -la\nwhoami\ncat readme.txt", size: "30B", date: "Today 10:00" }
            },
            "admin": { _type: "dir", perms: "drwx------", owner: "admin" }
        }
    };

    const guideText = "=========================================\n[시스템 사용 가이드]\n💡 `help`: 명령어 목록\n💡 `hint`: 단계별 힌트 (명확한 명령어 가이드 포함)\n💡 파이프라인('|')과 'grep', 'find'를 활용해 단서를 찾으세요.\n=========================================\n\n";

    // 튜토리얼 1: 숨겨진 파일 및 단순 읽기
    if (scenarioId === 1) {
        scenarioData.password = "easyadmin";

        fileSystem.home.guest["readme.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "480", content: guideText + "목표: /sbin/sys_unlock 파일을 실행하여 시스템을 복구하세요.\n\n시스템 관리자가 어디선가 암호를 적어놓고 숨겨두었습니다.\n숨겨진 파일은 보통 파일명 앞에 마침표(.)가 붙어 있습니다. 여러분의 홈 디렉토리 어딘가에 관리자의 비밀번호가 적힌 숨김 파일이 있는지 찾아보세요!"
        }; fileSystem.home.guest[".secret_note"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "12", content: "admin 계정의 비밀번호는 easyadmin 입니다."
        };
    }
    // 튜토리얼 2: 환경변수와 디렉토리 이동
    else if (scenarioId === 2) {
        scenarioData.password = "root2026";

        fileSystem.home.guest["readme.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "480", content: guideText + "목표: /sbin/sys_unlock 파일을 실행하여 시스템을 복구하세요.\n\n이번에는 조금 더 깊이 찾아야 합니다. /etc 디렉토리 어딘가에 시스템 관리자가 설정 파일을 남겨두었습니다. 디렉토리를 이동하며 파일을 뒤져 관리자(admin)의 비밀번호를 획득하세요."
        }; fileSystem.etc["admin_config.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "root", size: "35", content: "Temporary admin password set to: root2026\nPlease change ASAP."
        };
    }
    // 시나리오 1: 다중 인코딩 (Base64 + ROT13)
    else if (scenarioId === 3) {
        const secretKey = "SECRETKEY" + Math.floor(Math.random() * 9999);
        scenarioData.password = secretKey;
        // ROT13으로 먼저 변환하고 Base64로 인코딩
        const rot13Key = rot13(secretKey);
        const finalEncrypted = btoa(rot13Key);

        fileSystem.home.guest["readme.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "480", content: guideText + "목표: /sbin/sys_unlock 파일을 실행하여 시스템을 복구하세요.\n\n시스템 어딘가에 관리자의 백업된 인증 정보가 숨겨져 있습니다.\n해당 단서를 적절한 도구로 해독하고 관리자 계정('admin')으로 전환해야 합니다."
        }; fileSystem.var.backups["admin_pass.crypt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "root", size: "44", content: finalEncrypted
        };
    }
    // 시나리오 2: 해시 크래킹 + 워드리스트 + 솔트
    else if (scenarioId === 4) {
        const targetPass = "apple123";
        const salt = "XyZ" + Math.floor(Math.random() * 99);
        scenarioData.password = targetPass;

        fileSystem.home.guest["readme.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "480", content: guideText + "목표: /sbin/sys_unlock 파일을 실행하여 시스템을 복구하세요.\n\n시스템 임시 폴더 근처에 권한 관리를 위한 주요 백업 파일이 유출되었습니다.\n또한 시스템에 적용된 보안 설정값(Salt) 문서를 찾아, 무차별 대입(Bruteforce) 공격을 통해 관리자 계정('admin') 비밀번호를 알아내야 합니다."
        }; fileSystem.tmp["shadow.bak"] = {
            _type: "file", perms: "-rw-r--r--", owner: "root", content: `root:*:18353:7:::\nadmin:$1$${salt}$e2a11ef721d1542d8:18353:7:::\nguest:*:18353:7:::`
        };
        fileSystem.usr.share.wordlists["rockyou.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "root", content: "123456\npassword\napple123\nadmin\nqwerty"
        };
        fileSystem.opt[".env"] = {
            _type: "file", perms: "-rw-r--r--", owner: "root", content: `DB_NAME=core\nHASH_SALT=${salt}\nDEBUG=false`
        };
    }
    // 시나리오 3: JWT 위조 및 API 침투
    else if (scenarioId === 5) {
        const secret = "SUPER_SECRET_" + Math.random().toString(36).substr(2, 5);
        scenarioData.port = Math.floor(8000 + Math.random() * 1000);
        scenarioData.secret = secret;
        scenarioData.oldToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciJ9.SIGNATUREDUMMY";

        fileSystem.home.guest["readme.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "480", content: guideText + "목표: 서버의 백도어 API를 호출하여 시스템 권한을 우회하세요.\n\n로컬 네트워크 상의 숨겨진 백그라운드 포트를 추적하고, 취약한 인증(JWT) 관리 서버의 비밀 키를 탈취하세요. 위조된 인증 토큰을 만들어 관리자 권한으로 API에 접근해야 합니다."
        }; fileSystem.opt.api = {
            _type: "dir", perms: "drwxr-xr-x", owner: "root",
            "config.js": { _type: "file", perms: "-rw-r--r--", owner: "root", content: `module.exports = {\n  port: ${scenarioData.port},\n  jwt_secret: '${secret}'\n}` }
        };
        fileSystem.var.log["api.log"] = {
            _type: "file", perms: "-rw-r--r--", owner: "root", content: `[INFO] Request to /login by guest\n[DEBUG] Token generated: ${scenarioData.oldToken}`
        };
    }
    // 시나리오 4: SUID 기반 버퍼 오버플로우
    else if (scenarioId === 6) {
        fileSystem.home.guest["readme.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "480", content: guideText + "목표: 시스템의 취약점을 공략하여 root 권한을 탈취 후 /sbin/sys_unlock 실행\n\n시스템에 잘못된 특수 권한이 설정된 채 설치된 프로그램이 존재합니다. 메모리 오버플로우를 발생시켜 최고 관리자(root) 셸을 확보하세요."
        }; fileSystem.usr.bin["vuln_prog"] = {
            _type: "exec", perms: "-rwsr-xr-x", owner: "root", size: "15M", date: "Today 12:00",
            fn: function (args) {
                if (args.length === 0) return { out: "Usage: vuln_prog [input]", err: true };
                if (args[0].length > 40) {
                    currentUser = 'root'; // 권한 상승!
                    currentPath = ['root'];
                    updatePrompt();
                    return { out: "Segmentation fault (core dumped)...\nExploit successful. Spawning root shell.", success: true };
                } else {
                    return { out: `Hello, ${args[0]}! Input buffer safe.`, err: false };
                }
            }
        };
    }

    print("Ubuntu 22.04.1 LTS linux-core tty1", "system");
    print(`[INFO] Hacking Scenario #${scenarioId} loaded.`, "system");
    print("Welcome to Linux. Type 'help' for a list of available commands.");
    print("💡 [SYSTEM] 시작하려면 <span class='system'>cat readme.txt</span> 를 입력하여 미션 목표를 확인하세요.<br>");
    updatePrompt();
}

const outputDiv = document.getElementById('output');
const cmdInput = document.getElementById('cmd');
const promptSpan = document.getElementById('prompt');

function getDisplayPath() {
    const pathStr = '/' + currentPath.join('/');
    if (pathStr === `/home/${currentUser}`) return '~';
    if (pathStr.startsWith(`/home/${currentUser}/`)) return '~' + pathStr.substring(`/home/${currentUser}`.length);
    return pathStr || '/';
}

function updatePrompt() {
    const userClass = `user-${currentUser}`;
    promptSpan.innerHTML = `<span class="${userClass}">${currentUser}@linux</span>:<span class="prompt-dir">${getDisplayPath()}</span>$`;
}

function print(text, className = '') {
    const div = document.createElement('div');
    if (className) div.className = className;
    div.innerHTML = text;
    outputDiv.appendChild(div);

    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        MathJax.typesetPromise([div]).then(() => window.scrollTo(0, document.body.scrollHeight));
    } else {
        window.scrollTo(0, document.body.scrollHeight);
    }
}

function winGame(msg) {
    print("\n=========================================", "success");
    print("[SUCCESS] SYSTEM HACKED AND RECOVERED!", "success");
    print(`[INFO] Msg: ${msg}`, "success");

    // 아스키 아트 출력 부분
    const asciiArt = `
  _________                            __         ._.
 /   _____/ ____   ___________   _____/  |_  _____| |
 \\_____  \\_/ ___\\ /  _ \\_  __ \\_/ __ \\   __\\/  ___/ |
 /        \\  \\___(  <_> )  | \\/\\  ___/|  |  \\___ \\|\\|
/_______  /\\___  >____/|__|    \\___  >__| /____  >__
        \\/     \\/                  \\/          \\/ \\/
            `;
    print(`<pre class="success ascii-art">${asciiArt}</pre>`, "");

    print("\n🎉 시스템 권한을 성공적으로 복구했습니다! 축하합니다! 🎉", "success");
    print("=========================================", "success");
    print("[INFO] 서버를 재시작하려면 'reboot'을 입력하세요.", "system");
}

function checkPerm(node, user, actionType) {
    if (user === 'root') return true;
    let offset = (node.owner === user) ? 1 : 7;
    let charToCheck = actionType === 'read' ? 'r' : (actionType === 'write' ? 'w' : (actionType === 'exec' ? 'x' : 's'));

    // SUID 체크
    if (actionType === 'exec' && node.perms[3] === 's') return true;

    if (actionType === 'read') return node.perms[offset] === charToCheck;
    if (actionType === 'exec') return node.perms[offset + 2] === charToCheck || node.perms[offset + 2] === 's';
    return false;
}

function resolvePath(targetPath) {
    if (!targetPath) return [...currentPath];
    let resPath = [...currentPath];
    let segments = targetPath.split('/');

    if (targetPath.startsWith('/')) resPath = [];
    else if (targetPath.startsWith('~')) {
        resPath = ['home', currentUser];
        segments.shift();
    }

    for (const segment of segments) {
        if (!segment || segment === '.') continue;
        if (segment === '..') {
            if (resPath.length > 0) resPath.pop();
        } else {
            resPath.push(segment);
        }
    }
    return resPath;
}

function getTargetNode(pathArray) {
    let current = fileSystem;
    for (const part of pathArray) {
        if (current && current[part]) current = current[part];
        else return null;
    }
    return current;
}

function getAllFilesRecursive(dir, pathStr = "", result = []) {
    for (const key in dir) {
        if (key.startsWith('_')) continue;
        const node = dir[key];
        const fullPath = pathStr + "/" + key;
        result.push({ name: key, path: fullPath, node: node });
        if (node._type === 'dir') {
            getAllFilesRecursive(node, fullPath, result);
        }
    }
    return result;
}

cmdInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        const inputVal = cmdInput.value.trim();
        cmdInput.value = '';

        if (gameState === 'BOOT_MENU') {
            print(`<div>${promptSpan.innerHTML} ${inputVal}</div>`);

            if (['0', '1', '2', '3', '4', '5', '6'].includes(inputVal)) { // Updated to include new scenarios 0 and 1
                loadScenario(parseInt(inputVal));
            } else print("Invalid choice.", "error");
            return;
        }

        if (awaitingPasswordFor) {
            cmdInput.type = 'text';
            promptSpan.style.display = 'inline';
            print(`<div>Password: ********</div>`);

            let success = false;
            if ((scenarioId === 1 || scenarioId === 2 || scenarioId === 3 || scenarioId === 4) && awaitingPasswordFor === 'admin') {
                if (inputVal === scenarioData.password) success = true;
            }

            if (success) {
                currentUser = awaitingPasswordFor;
                currentPath = ['home', currentUser];
                updatePrompt();
            } else print(`su: Authentication failure`, "error");
            awaitingPasswordFor = null;
            return;
        }

        if (inputVal) {
            history.push(inputVal);
            historyIndex = history.length;
        }
        print(`<div>${promptSpan.innerHTML} ${inputVal}</div>`);
        if (inputVal) processPipeline(inputVal);
    }
    else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) { historyIndex--; cmdInput.value = history[historyIndex]; }
    }
    else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < history.length - 1) { historyIndex++; cmdInput.value = history[historyIndex]; }
        else { historyIndex = history.length; cmdInput.value = ''; }
    }
});

// 파이프라인 | 처리
function processPipeline(input) {
    const commands = input.split('|').map(s => s.trim());
    let currentOutput = null;

    for (let i = 0; i < commands.length; i++) {
        const isLast = (i === commands.length - 1);
        currentOutput = executeCommand(commands[i], currentOutput, isLast);
        if (currentOutput === null && !isLast) break; // 에러 시 파이프라인 중단
    }
}

function executeCommand(input, pipeInput, printOutput) {
    // 간단하게 공백 분리 및 따옴표 제거
    const args = [];
    let inQuotes = false;
    let currentArg = "";
    for (let i = 0; i < input.length; i++) {
        if (input[i] === '"') { inQuotes = !inQuotes; }
        else if (input[i] === ' ' && !inQuotes) {
            if (currentArg.length > 0) { args.push(currentArg); currentArg = ""; }
        } else currentArg += input[i];
    }
    if (currentArg.length > 0) args.push(currentArg);

    let cmd = args[0];
    let outData = "";

    if (cmd.includes('/')) {
        const execNode = getTargetNode(resolvePath(cmd));
        if (!execNode) { print(`bash: ${cmd}: No such file or directory`, "error"); return null; }
        if (execNode._type !== 'exec' || !checkPerm(execNode, currentUser, 'exec')) { print(`bash: ${cmd}: Permission denied`, "error"); return null; }
        const result = execNode.fn(args.slice(1));
        if (printOutput && result.out) print(result.out, result.success ? "success" : (result.err ? "error" : ""));
        return result.out;
    }

    switch (cmd) {
        case 'help':
            outData = "Available commands:\n ls [-a] [-l] [dir] : List directory contents\n cd [dir]           : Change directory\n cat [file]         : Print file content\n su [user]          : Substitute user identity\n base64 -d [file]   : Decode base64 data\n tr [opt]           : Translate characters (e.g. tr 'A-Za-z' 'N-ZA-Mn-za-m' for ROT13)\n crack [opt] [file] : Bruteforce hash utility\n netstat -tuln      : Print network connections\n find [path] -name  : Find files by name\n grep [keyword]     : Filter output\n jwt-forge [opt]    : Forge tokens (CTF tool)\n curl [url]         : Transfer data from server\n hint               : Get a hint\n reboot             : Restart system";
            break;
        case 'grep':
            if (args.length < 2) { print("Usage: grep [keyword]", "error"); return null; }
            const keyword = args[1];
            if (!pipeInput) { print("grep: waiting for input...", "error"); return null; }
            outData = pipeInput.split('\n').filter(l => l.includes(keyword)).join('\n');
            break;
        case 'find':
            const searchPath = args[1] || '/';
            const findNode = getTargetNode(resolvePath(searchPath));
            if (!findNode || findNode._type !== 'dir') { print(`find: ${searchPath}: No such directory`, "error"); return null; }
            let filterName = null;
            if (args.includes("-name")) filterName = args[args.indexOf("-name") + 1].replace(/\*/g, '');
            const allFiles = getAllFilesRecursive(findNode, searchPath === '/' ? "" : searchPath);
            outData = allFiles.filter(f => !filterName || f.name.includes(filterName)).map(f => f.path).join('\n');
            break;
        case 'hint':
            hintLevel++;
            outData = `--- HINT LEVEL ${Math.min(hintLevel, 5)} ---\n`;
            if (scenarioId === 1) { // 튜토리얼 1
                if (hintLevel === 1) outData += "현재 디렉토리에 숨겨진 파일이 있는지 확인하세요.\n명령어: `ls -la`";
                else if (hintLevel === 2) outData += ".secret_note 라는 파일이 보일 것입니다. 내부에 적힌 글씨를 읽어보세요.\n명령어: `cat .secret_note`";
                else if (hintLevel === 3) outData += "비밀번호 'easyadmin'을 알아냈습니다. 이제 관리자 권한을 획득해야 합니다.\n명령어: `su admin` 이후 'easyadmin'을 입력하세요.";
                else outData += "권한을 얻었다면 잠금 해제 스크립트를 실행해 목표를 달성하세요.\n명령어: `/sbin/sys_unlock`";
            } else if (scenarioId === 2) { // 튜토리얼 2
                if (hintLevel === 1) outData += "/etc 디렉토리로 이동하여 내부를 살펴보세요.\n명령어: `cd /etc` 이어서 `ls`";
                else if (hintLevel === 2) outData += "디렉토리 안에 보이는 admin_config.txt 파일의 내용을 읽어 비밀번호를 파악하세요.\n명령어: `cat admin_config.txt`";
                else if (hintLevel === 3) outData += "비밀번호 'root2026'을 기억하고, 관리자로 전환하세요.\n명령어: `su admin` 이후 'root2026'을 입력하세요.";
                else outData += "관리자가 되었다면 시스템 복구 스크립트를 실행하세요.\n명령어: `/sbin/sys_unlock`";
            } else if (scenarioId === 3) { // 시나리오 1
                if (hintLevel === 1) outData += "시스템 백업 디렉토리가 의심스럽습니다. 디렉토리를 열어 확인하세요.\n명령어: `ls -la /var/backups`";
                else if (hintLevel === 2) outData += "암호화된 파일(admin_pass.crypt)의 내용을 확인하세요.\n명령어: `cat /var/backups/admin_pass.crypt`";
                else if (hintLevel === 3) outData += "데이터가 Base64로 인코딩 되어 있습니다. 파이프(|)를 사용해 복호화(디코딩) 하세요.\n명령어: `cat /var/backups/admin_pass.crypt | base64 -d`";
                else if (hintLevel === 4) outData += "디코딩 결과가 이상한 철자라면 ROT13 암호화가 이중으로 걸려있기 때문입니다. tr 명령어로 다시 문자를 치환하세요.\n명령어: `cat /var/backups/admin_pass.crypt | base64 -d | tr 'A-Za-z' 'N-ZA-Mn-za-m'`";
                else outData += "이제 올바른 비밀번호를 찾았습니다. su 명령어로 로그인 후 복구를 실행하세요.\n1. `su admin` 입력 후 해독한 비밀번호 입력\n2. `/sbin/sys_unlock` 실행";
            } else if (scenarioId === 4) { // 시나리오 2
                if (hintLevel === 1) outData += "임시 폴더(tmp)에 유출된 섀도우 파일을 찾으세요.\n명령어: `ls /tmp`";
                else if (hintLevel === 2) outData += "해시를 무차별 대입하려면 환경 설정에 들어간 솔트(salt)값을 알아야 합니다. 전체 시스템에서 .env 파일을 검색하세요.\n명령어: `find / -name *.env*`";
                else if (hintLevel === 3) outData += "검색된 /opt/.env 파일의 내용을 읽어서, 내부의 솔트(HASH_SALT) 값을 알아내 복사해두세요.\n명령어: `cat /opt/.env`";
                else if (hintLevel === 4) outData += "이제 알아낸 솔트값과 리눅스용 해킹 사전 파일(rockyou)을 결합하여 해시 크랙을 실행하세요.\n명령어: `crack --salt [적혀있던솔트값] --wordlist /usr/share/wordlists/rockyou.txt /tmp/shadow.bak`";
                else outData += "크랙이 완료되어 [apple123] 이라는 원래 비밀번호가 나왔습니다!\n1. `su admin` 입력 후 apple123 입력\n2. `/sbin/sys_unlock` 실행";
            } else if (scenarioId === 5) { // 시나리오 3
                if (hintLevel === 1) outData += "현재 구동 중인 숨겨진 프로세스와 포트를 탐색하세요.\n명령어: `netstat -tuln`";
                else if (hintLevel === 2) outData += "발견된 백그라운드 포트와 관련된 API 서버 설정 파일을 찾아 시크릿 키를 구하세요.\n/opt/api 디렉토리를 열어보세요. 명령어: `cat /opt/api/config.js`";
                else if (hintLevel === 3) outData += "설정 파일에서 jwt_secret 문자열을 복사한 뒤, jwt-forge를 이용해 위조된 관리자 토큰을 생성하세요.\n명령어: `jwt-forge --role=admin --secret=[복사한secret키]`";
                else if (hintLevel === 4) outData += "생성된 토큰을 활용해 방금 1번 힌트에서 알아낸 포트로 curl 통신 요청을 보내 백도어를 승인받아야 합니다.";
                else outData += "다음 명령어를 입력해서 조작한 헤더 데이터를 함께 전송하세요.\n명령어: `curl -H \"Authorization: Bearer [아까위조한토큰]\" http://127.0.0.1:[확인된포트]/unlock`";
            } else if (scenarioId === 6) { // 시나리오 4
                if (hintLevel === 1) outData += "잘못된 권한이 부여된 실행 파일을 찾아야 합니다. 보통 /usr/bin 폴더 안에 있습니다.\n명령어: `ls -la /usr/bin`";
                else if (hintLevel === 2) outData += "빨간색 표시 등에 's' 권한(SUID)이 들어간 의심스러운 'vuln_prog' 실행 프로그램을 찾았을 것입니다. 일단 문자를 넣어 실행해 보세요.\n명령어: `/usr/bin/vuln_prog test`";
                else if (hintLevel === 3) outData += "이 프로그램은 문자 입력을 제한 없이 받고 있어서 보안 취약점이 존재합니다. 의도적으로 긴 문자를 입력해 버퍼를 터뜨리세요.";
                else if (hintLevel === 4) outData += "명령행에 A 글자를 대략 40개 이상 꽉 채워 넣어 프로그램 메모리를 강제로 손상시키세요.\n명령어: `/usr/bin/vuln_prog AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`";
                else outData += "성공적으로 프로그램이 오작동하며 root(최고 관리자) 셸이 켜졌습니다. 이제 모든 권한이 허용됩니다.\n마지막 명령어: `/sbin/sys_unlock`";
            }
            if (hintLevel >= 5) { outData += "\n\n(모든 힌트가 공개되었습니다. 위 명령어들을 그대로 따라하시면 클리어할 수 있습니다!)"; hintLevel = 5; }
            break;
        case 'reboot':
            print("The system is going down for reboot NOW!", "system");
            cmdInput.disabled = true;
            setTimeout(() => { cmdInput.disabled = false; initBootMenu(); }, 2000);
            return null;
        case 'clear':
            outputDiv.innerHTML = ''; return null;
        case 'pwd':
        case 'whoami':
            outData = cmd === 'pwd' ? '/' + currentPath.join('/') : currentUser;
            break;
        case 'su':
            const targetUser = args[1] || 'root';
            print(`Password for ${targetUser}:`);
            awaitingPasswordFor = targetUser;
            cmdInput.type = 'password';
            promptSpan.style.display = 'none';
            return null;
        case 'ls':
            let showHidden = args.includes('-a') || args.includes('-la') || args.includes('-al');
            let longFormat = args.includes('-l') || args.includes('-la') || args.includes('-al');
            let targetDirArg = args.find(a => !a.startsWith('-') && a !== 'ls');
            const lsNode = getTargetNode(resolvePath(targetDirArg || ''));
            if (!lsNode) { print(`ls: cannot access '${targetDirArg}': No such file or directory`, "error"); return null; }
            if (lsNode._type !== 'dir') { outData = targetDirArg; break; }
            if (!checkPerm(lsNode, currentUser, 'read')) { print(`ls: Permission denied`, "error"); return null; }
            for (const key in lsNode) {
                if (key.startsWith('_')) continue;
                if (!showHidden && key.startsWith('.')) continue;
                const item = lsNode[key];
                let spanClass = item._type === 'dir' ? "dir" : (item._type === 'exec' ? "exec" : "");
                if (longFormat) outData += `${item.perms} 1 ${item.owner.padEnd(6)} ${item.owner.padEnd(6)} ${(item.size || '4.0K').padStart(5)} ${item.date || 'Oct 24 10:00'} <span class="${spanClass}">${key}</span>\n`;
                else outData += `<span class="${spanClass}">${key}</span>  `;
            }
            break;
        case 'cd':
            const newPath = resolvePath(args[1] || '~');
            const targetDir = getTargetNode(newPath);
            if (!targetDir || targetDir._type !== 'dir') print(`cd: ${args[1]}: Not a directory`, "error");
            else if (!checkPerm(targetDir, currentUser, 'exec')) print(`cd: Permission denied`, "error");
            else { currentPath = newPath; updatePrompt(); }
            return null;
        case 'cat':
            if (args.length < 2) { print("cat: missing file operand", "error"); return null; }
            const catFile = getTargetNode(resolvePath(args[1]));
            if (!catFile || catFile._type !== 'file') print(`cat: ${args[1]}: File not found`, "error");
            else if (!checkPerm(catFile, currentUser, 'read')) print(`cat: Permission denied`, "error");
            else outData = catFile.content;
            break;
        case 'base64':
            let contentToDecode = pipeInput;
            if (args[1] === '-d' && args[2]) {
                const b64F = getTargetNode(resolvePath(args[2]));
                if (b64F && b64F._type === 'file') contentToDecode = b64F.content;
            }
            if (contentToDecode) {
                try { outData = atob(contentToDecode.trim()); } catch (e) { print("base64: invalid input", "error"); return null; }
            } else { print("Usage: base64 -d [file] or pipe data", "error"); return null; }
            break;
        case 'tr':
            if (args.length >= 3 && pipeInput) {
                // Very simplified tr for ROT13
                if (args[1] === "'A-Za-z'" && args[2] === "'N-ZA-Mn-za-m'") {
                    outData = rot13(pipeInput);
                } else outData = pipeInput;
            } else { print("Usage: tr [set1] [set2]", "error"); return null; }
            break;
        case 'crack':
            let wordlist = "", salt = "";
            let targetHashFile = args[args.length - 1];
            for (let i = 1; i < args.length - 1; i++) {
                if (args[i] === '--wordlist') wordlist = args[i + 1];
                if (args[i] === '--salt') salt = args[i + 1];
            }
            const hashFile = getTargetNode(resolvePath(targetHashFile));
            if (hashFile && hashFile._type === 'file' && checkPerm(hashFile, currentUser, 'read')) {
                cmdInput.disabled = true;
                print("Loading rainbow tables and executing attack...");
                setTimeout(() => {
                    if (scenarioId === 2 && wordlist.includes("rockyou.txt") && salt === scenarioData.password.substring(0, 0) /* Dummy check, salt match */) {
                        // Checking if the actual salt matches the required one
                        const actualSalt = fileSystem.opt[".env"].content.match(/HASH_SALT=(.+)/)[1];
                        if (salt === actualSalt) {
                            print(`[+] SUCCESS! Hash cracked! admin : ${scenarioData.password}`, "success");
                        } else {
                            print("crack: Attack failed. Incorrect salt or wordlist.");
                        }
                    } else {
                        print("crack: Attack failed. Check arguments.");
                    }
                    cmdInput.disabled = false;
                    cmdInput.focus();
                }, 1500);
                return null;
            } else print(`crack: File not found`, "error");
            return null;
        case 'jwt-forge':
            let role = "", secretKey = "";
            for (let i = 1; i < args.length; i++) {
                if (args[i].startsWith('--role=')) role = args[i].split('=')[1];
                if (args[i].startsWith('--secret=')) secretKey = args[i].split('=')[1];
            }
            if (role && secretKey) {
                outData = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoi${role}In0.${btoa(secretKey)}`;
                print(`Token Generated:\n${outData}`, "success");
                return null;
            } else print("Usage: jwt-forge --role=[role] --secret=[secret_key]", "error");
            return null;
        case 'netstat':
            if (args[1] === '-tuln') {
                outData = "Active Internet connections\nProto Local Address           State\ntcp   0.0.0.0:22              LISTEN";
                if (scenarioId === 3) outData += `\ntcp   127.0.0.1:${scenarioData.port}       LISTEN`;
            } else print("Usage: netstat -tuln");
            break;
        case 'curl':
            const url = args[lastIdx = args.length - 1];
            let authHeader = "";
            if (args[1] === '-H') authHeader = args[2];
            if (scenarioId === 3 && url.includes(`127.0.0.1:${scenarioData.port}`)) {
                const expectedSig = btoa(scenarioData.secret);
                if (authHeader.includes('Bearer') && authHeader.includes(`"role":"admin"`) || authHeader.includes(expectedSig)) {
                    winGame("API call authorized with forged JWT. Core unlocked remotely.");
                } else {
                    outData = `{"error": "Unauthorized. Invalid JWT signature or role."}`;
                }
            } else outData = `curl: (7) Failed to connect to port`;
            break;
        default:
            print(`${cmd}: command not found`, "error"); return null;
    }

    if (printOutput && outData) print(outData);
    return outData;
}

window.onload = function () {
    initBootMenu();
};
