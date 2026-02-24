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
    print("  [1] 시나리오 1: 다중 암호화 해독 (ROT13 + Base64)");
    print("  [2] 시나리오 2: 해시 크래킹 및 단어 사전 (Wordlist + Salt)");
    print("  [3] 시나리오 3: 원격 API 침투 및 JWT 위조 (JWT Forgery)");
    print("  [4] 시나리오 4: SUID 버퍼 오버플로우 (Buffer Overflow)");
    print("  [5] 랜덤 시나리오 배정 (Random Scenario)");
    print("-----------------------------------------", "system");
    promptSpan.innerHTML = "선택 (1-5): ";
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
    if (scenarioId === 5) scenarioId = Math.floor(Math.random() * 4) + 1;
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

    const guideText = "=========================================\n[시스템 사용 가이드]\n💡 `help`: 명령어 목록\n💡 `hint`: 단계별 힌트\n💡 파이프라인('|')과 'grep', 'find'를 활용해 단서를 찾으세요.\n=========================================\n\n";

    // 시나리오 1: 다중 인코딩 (Base64 + ROT13)
    if (scenarioId === 1) {
        const secretKey = "SECRETKEY" + Math.floor(Math.random() * 9999);
        scenarioData.password = secretKey;
        // ROT13으로 먼저 변환하고 Base64로 인코딩
        const rot13Key = rot13(secretKey);
        const finalEncrypted = btoa(rot13Key);

        fileSystem.home.guest["readme.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "480", content: guideText + "목표: /sbin/sys_unlock 파일을 실행하여 시스템을 복구하세요.\n\n시스템 어딘가에 관리자의 백업된 인증 정보가 숨겨져 있습니다.\n해당 단서를 적절한 도구로 해독하고 관리자 계정('admin')으로 전환해야 합니다.\n\n⚠️ 주의: `hint` 명령어는 정말로 해결 방법이 생각나지 않을 때만 사용하는 최후의 수단입니다. 스스로의 힘으로 풀어내는 것을 권장합니다."
        }; fileSystem.var.backups["admin_pass.crypt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "root", size: "44", content: finalEncrypted
        };
    }
    // 시나리오 2: 해시 크래킹 + 워드리스트 + 솔트
    else if (scenarioId === 2) {
        const targetPass = "apple123";
        const salt = "XyZ" + Math.floor(Math.random() * 99);
        scenarioData.password = targetPass;

        fileSystem.home.guest["readme.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "480", content: guideText + "목표: /sbin/sys_unlock 파일을 실행하여 시스템을 복구하세요.\n\n시스템 임시 폴더 근처에 권한 관리를 위한 주요 백업 파일이 유출되었습니다.\n또한 시스템에 적용된 보안 설정값(Salt) 문서를 찾아, 무차별 대입(Bruteforce) 공격을 통해 관리자 계정('admin') 비밀번호를 알아내야 합니다.\n\n⚠️ 주의: 도저히 감이 잡히지 않을 때만 `hint`를 검색하세요. 먼저 끈질기게 탐색하는 것이 해커의 기본 소양입니다."
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
    else if (scenarioId === 3) {
        const secret = "SUPER_SECRET_" + Math.random().toString(36).substr(2, 5);
        scenarioData.port = Math.floor(8000 + Math.random() * 1000);
        scenarioData.secret = secret;
        scenarioData.oldToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciJ9.SIGNATUREDUMMY";

        fileSystem.home.guest["readme.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "480", content: guideText + "목표: 서버의 백도어 API를 호출하여 권한을 우회하세요.\n\n현재 로컬 네트워크 상에서 구동 중인 숨겨진 프로세스와 포트를 추적하세요.\n해당 웹 서비스의 취약한 인증 인프라(JWT)의 서명 키를 탈취해 임의의 관리자('admin') 권한을 위조하여 API에 접근해야 합니다.\n\n⚠️ 주의: `hint` 명령어는 플레이어의 재미를 반감시킬 수 있습니다. 진짜 방법이 떠오르지 않는 마지막 스텝에서만 활용하세요."
        }; fileSystem.opt.api = {
            _type: "dir", perms: "drwxr-xr-x", owner: "root",
            "config.js": { _type: "file", perms: "-rw-r--r--", owner: "root", content: `module.exports = {\n  port: ${scenarioData.port},\n  jwt_secret: '${secret}'\n}` }
        };
        fileSystem.var.log["api.log"] = {
            _type: "file", perms: "-rw-r--r--", owner: "root", content: `[INFO] Request to /login by guest\n[DEBUG] Token generated: ${scenarioData.oldToken}`
        };
    }
    // 시나리오 4: SUID 기반 버퍼 오버플로우
    else if (scenarioId === 4) {
        fileSystem.home.guest["readme.txt"] = {
            _type: "file", perms: "-rw-r--r--", owner: "guest", size: "480", content: guideText + "목표: 시스템의 취약점을 공략하여 root 권한을 탈취 후 /sbin/sys_unlock 실행\n\n시스템에 잘못된 특수 권한이 설정된 채 설치된 프로그램이 존재합니다.\n해당 프로그램 실행 시 메모리 버퍼 오버플로우가 발생할 수 있습니다. 이를 악용하여 일시적으로 최고 관리자(root) 권한에 도달하세요.\n\n⚠️ 주의: 어디서부터 시작해야 할지 전혀 감이 안 올 때만 최후의 수단으로 `hint` 명령어를 사용하시기 바랍니다."
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
            if (['1', '2', '3', '4', '5'].includes(inputVal)) {
                loadScenario(parseInt(inputVal));
            } else print("Invalid choice.", "error");
            return;
        }

        if (awaitingPasswordFor) {
            cmdInput.type = 'text';
            promptSpan.style.display = 'inline';
            print(`<div>Password: ********</div>`);

            let success = false;
            if ((scenarioId === 1 || scenarioId === 2) && awaitingPasswordFor === 'admin') {
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
            if (scenarioId === 1) {
                if (hintLevel === 1) outData += "1. 시스템 백업 디렉토리를 탐색해야 합니다. `ls -la /var/backups` 명령어로 숨겨진 내용을 확인하세요.";
                else if (hintLevel === 2) outData += "2. `cat /var/backups/admin_pass.crypt` 로 백업 파일 내용을 확인하면 알 수 없는 문자가 나옵니다.\n이는 Base64로 형태가 바뀌었기 원본 내용을 한 번 가렸기 때문입니다.";
                else if (hintLevel === 3) outData += "3. 파이프 연산자(`|`)를 사용하면 명령어의 결과를 다른 명령어의 입력으로 넘길 수 있습니다.\n`cat /var/backups/admin_pass.crypt | base64 -d` 를 입력해 디코딩하세요.";
                else if (hintLevel === 4) outData += "4. 디코딩된 문자열이 여전히 이상하다면, 치환 암호인 ROT13이 적용되어 있기 때문입니다.\n이는 알파벳 자체를 13칸 미는 고전적 암호 방식입니다.";
                else outData += "5. `tr` (문자 변환) 명령어를 사용해 ROT13을 역순환시킬 수 있습니다.\n다음과 같이 파이프를 두 번 구성해 결과를 도출하세요:\n`cat /var/backups/admin_pass.crypt | base64 -d | tr 'A-Za-z' 'N-ZA-Mn-za-m'`\n결과 비밀번호를 기억해 `su admin` 에 로그인하세요.";
            } else if (scenarioId === 2) {
                if (hintLevel === 1) outData += "1. `ls /tmp` 를 입력해 임시 폴더에 방치된 `shadow.bak` (비밀번호 권한 파일)을 찾아내세요.";
                else if (hintLevel === 2) outData += "2. 암호를 해독(크래킹)하려면 사전 파일도 필요합니다. 시스템의 로컬 워드리스트 리소스는 `/usr/share/wordlists/rockyou.txt` 경로에 존재합니다.";
                else if (hintLevel === 3) outData += "3. 비밀번호에 적용된 해시 난수값(솔트)을 알아내야 합니다.\n`find / -name \".env*\"` 명령어를 통해 환경설정 파일을 탐색해 보세요.";
                else if (hintLevel === 4) outData += "4. `/opt/.env` 위치에서 솔트 값을 탈취했다면, 이제 `crack` 도구를 활용할 준비가 되었습니다.\n`crack` 활용법 : `crack --salt [솔트] --wordlist [사전파일경로] [해시파일경로]`";
                else outData += "5. 다음 명령어를 실행하여 섀도우 파일에 포함된 패스워드와 매칭되는 단어를 찾아보세요:\n`crack --salt [솔트값] --wordlist /usr/share/wordlists/rockyou.txt /tmp/shadow.bak`";
            } else if (scenarioId === 3) {
                if (hintLevel === 1) outData += "1. 현재 서버에서 돌아가는 백그라운드 서비스의 포트를 찾아야 합니다.\n`netstat -tuln` 명령어를 입력해 LISTEN 포트를 탐색하세요.";
                else if (hintLevel === 2) outData += "2. 찾으신 포트에 연동된 API 소스 코드가 존재하는 폴더들을 뒤져야합니다. 파일 구조를 파악해 `/opt/api/config.js` 를 찾아 `cat`으로 확인해 시크릿(secret) 토큰을 알아내세요.";
                else if (hintLevel === 3) outData += "3. 위조 인증 토큰 생성기를 활용해 서버 관리자 계정('admin')으로 둔갑하세요.\n적용 명령어: `jwt-forge --role=admin --secret=[시크릿키]`";
                else if (hintLevel === 4) outData += "4. 이제 curl 명령어를 사용해 API 타겟 URL로 웹 요청을 수행해야 합니다. 목적지는 `http://127.0.0.1:[확인된포트]/unlock` 입니다.";
                else outData += "5. curl 요청 시 `-H` (헤더 삽입) 옵션을 통해 방금 만든 JWT 위조 토큰을 권한 정보에 심어 보내야 합니다:\n`curl -H \"Authorization: Bearer [복사해둔새로운토큰]\" http://127.0.0.1:[포트]/unlock`";
            } else if (scenarioId === 4) {
                if (hintLevel === 1) outData += "1. 프로그램 강제 권한 탈취를 위해 일반 사용자임에도 관리자의 기능으로 돌아가는 파일(SUID)을 찾아야 합니다.\n`ls -la /usr/bin` 등으로 의심되는 파일을 찾아보세요.";
                else if (hintLevel === 2) outData += "2. 실행 권한이 `x`가 아닌 `s`로 표시된 `/usr/bin/vuln_prog` 를 발견했다면, 실행해보고 입력을 어떻게 받는지 확인해보세요.";
                else if (hintLevel === 3) outData += "3. 이 응용 프로그램은 문자 코드를 입력받습니다. 만약 너무 많이 입력하게 되면 어떻게 될까요?\n이를 강하게 밀어 넣었을 때 에러(Segmentation fault)와 함께 오작동을 유도할 수 있습니다.";
                else if (hintLevel === 4) outData += "4. 터미널 명령줄 한도로 넘어갈 수 있는 매우 많은 문자열을 인자 값으로 넘겨 버퍼 오버플로우를 발생시키세요.\n예시: `/usr/bin/vuln_prog AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`";
                else outData += "5. 공격에 성공하면 셸 프롬프트가 `root@linux`로 바뀌게 됩니다.\n이 상황에서 마지막 목표인 `/sbin/sys_unlock` 명령어를 치면 미션을 클리어할 수 있습니다.";
            }
            if (hintLevel >= 5) { outData += "\n\n(모든 힌트가 공개되었습니다. 행운을 빕니다!)"; hintLevel = 5; }
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
