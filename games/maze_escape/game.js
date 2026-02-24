        // 모바일 환경 감지
        let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
            isMobile = true;
        }

        const MAZE_SIZE = 35;
        const CELL_SIZE = 10;
        const WALL_HEIGHT = 12;
        const PLAYER_HEIGHT = 5;
        const PLAYER_SPEED = 30.0;
        const PLAYER_SIZE = 2;

        let camera, scene, renderer, controls;
        let mazeGroup; // [추가] 리셋을 쉽게 하기 위해 미로 구성요소들을 담을 그룹
        let maze = [], walls = [], markers = [];
        let exitMesh;

        let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
        let joyDelta = { x: 0, y: 0 };

        let prevTime = performance.now();

        let gameStarted = false, gameWon = false;
        let startTime = null, timerInterval = null;

        const raycaster = new THREE.Raycaster();
        const centerVector = new THREE.Vector2(0, 0);

        let markGeo, markMat;

        init();
        animate();

        // 페이지 새로고침(reload) 에러를 방지하기 위한 소프트 리셋 함수
        function resetGame() {
            // 1. 기존 그룹(미로, 마커 등)에서 모든 오브젝트 제거 및 메모리 해제
            for (let i = mazeGroup.children.length - 1; i >= 0; i--) {
                const child = mazeGroup.children[i];
                mazeGroup.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }

            // 2. 변수 및 배열 초기화
            walls = [];
            markers = [];
            exitMesh = null;

            // 3. 상태 및 타이머 초기화
            gameWon = false;
            gameStarted = false;
            startTime = null;
            clearInterval(timerInterval);
            document.getElementById('timer-display').innerText = '00:00';

            moveForward = false; moveBackward = false; moveLeft = false; moveRight = false;
            joyDelta = { x: 0, y: 0 };
            prevTime = performance.now();

            // 4. UI 초기화
            document.getElementById('win-screen').style.display = 'none';
            document.getElementById('blocker').style.display = 'flex';
            document.getElementById('crosshair').style.display = 'none';

            // 5. 미로 재생성 및 화면 재구성
            generateMaze();
            build3DMaze();
        }

        // 1. 순수 코드로 사이버펑크 벽 패턴(Grid) 텍스처 생성 함수
        function createWallTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#303242';
            ctx.fillRect(0, 0, 512, 512);

            ctx.strokeStyle = '#00f0ff';
            ctx.globalAlpha = 0.2;
            ctx.lineWidth = 4;

            ctx.beginPath();
            for (let i = 0; i <= 4; i++) {
                ctx.moveTo(0, i * 128);
                ctx.lineTo(512, i * 128);
                ctx.moveTo(i * 128, 0);
                ctx.lineTo(i * 128, 512);
            }
            ctx.stroke();

            ctx.strokeStyle = '#1a1c28';
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, 512, 512);

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2);
            return texture;
        }

        // 2. 거대한 X 모양 텍스처 생성 함수
        function createXMarkerTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');

            ctx.clearRect(0, 0, 256, 256);

            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 28;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0055';

            ctx.beginPath();
            ctx.moveTo(40, 40); ctx.lineTo(216, 216);
            ctx.moveTo(216, 40); ctx.lineTo(40, 216);
            ctx.stroke();

            return new THREE.CanvasTexture(canvas);
        }

        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1e1e28);
            scene.fog = new THREE.Fog(0x1e1e28, 0, CELL_SIZE * 10);

            // 초기 미로 구성요소들을 관리할 그룹 씬에 추가
            mazeGroup = new THREE.Group();
            scene.add(mazeGroup);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);

            const blocker = document.getElementById('blocker');
            const instructions = document.getElementById('instructions');
            const crosshair = document.getElementById('crosshair');

            markGeo = new THREE.PlaneGeometry(4, 4);
            markMat = new THREE.MeshBasicMaterial({
                map: createXMarkerTexture(),
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false
            });

            if (isMobile) {
                document.getElementById('desktop-desc').style.display = 'none';
                document.getElementById('mobile-desc').style.display = 'block';
                setupMobileControls();

                instructions.addEventListener('click', startGameMobile);
                instructions.addEventListener('touchstart', startGameMobile);
            } else {
                controls = new THREE.PointerLockControls(camera, document.body);
                scene.add(controls.getObject());

                instructions.addEventListener('click', () => controls.lock());
                controls.addEventListener('lock', () => {
                    gameStarted = true;
                    blocker.style.display = 'none';
                    crosshair.style.display = 'block';
                    startTimer();
                });
                controls.addEventListener('unlock', () => {
                    if (!gameWon) {
                        gameStarted = false;
                        blocker.style.display = 'flex';
                        crosshair.style.display = 'none';
                    }
                });

                document.addEventListener('keydown', onKeyDown);
                document.addEventListener('keyup', onKeyUp);
                document.addEventListener('mousedown', (e) => {
                    if (controls.isLocked && e.button === 0) handleMarkerAction();
                });
            }

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const flashLight = new THREE.PointLight(0xffffff, 1.2, CELL_SIZE * 7);
            camera.add(flashLight);

            const floorGeo = new THREE.PlaneGeometry(MAZE_SIZE * CELL_SIZE, MAZE_SIZE * CELL_SIZE);
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9 });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.set((MAZE_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2, 0, (MAZE_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2);
            scene.add(floor);

            const ceiling = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x151520 }));
            ceiling.rotation.x = Math.PI / 2;
            ceiling.position.set((MAZE_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2, WALL_HEIGHT, (MAZE_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2);
            scene.add(ceiling);

            generateMaze();
            build3DMaze();

            window.addEventListener('resize', onWindowResize);
        }

        function handleMarkerAction() {
            raycaster.setFromCamera(centerVector, camera);

            const markerIntersects = raycaster.intersectObjects(markers);
            if (markerIntersects.length > 0 && markerIntersects[0].distance < 15) {
                const hitMarker = markerIntersects[0].object;
                mazeGroup.remove(hitMarker); // scene 대신 mazeGroup에서 제거
                markers = markers.filter(m => m !== hitMarker);
                return;
            }

            const wallIntersects = raycaster.intersectObjects(walls);
            if (wallIntersects.length > 0 && wallIntersects[0].distance < 15) {
                const hit = wallIntersects[0];

                const mark = new THREE.Mesh(markGeo, markMat);
                mark.position.copy(hit.point);
                mark.position.addScaledVector(hit.face.normal, 0.02);
                mark.lookAt(hit.point.clone().add(hit.face.normal));

                mazeGroup.add(mark); // scene 대신 mazeGroup에 추가
                markers.push(mark);
            }
        }

        // --- 모바일 대응 ---
        function startGameMobile(e) {
            e.preventDefault();
            gameStarted = true;
            document.getElementById('blocker').style.display = 'none';
            document.getElementById('crosshair').style.display = 'block';
            document.getElementById('mobile-ui').style.display = 'block';
            startTimer();
        }

        function setupMobileControls() {
            const joyZone = document.getElementById('joystick-zone');
            const lookZone = document.getElementById('look-zone');
            const joyBase = document.getElementById('joystick-base');
            const joyThumb = document.getElementById('joystick-thumb');
            const actionBtn = document.getElementById('action-btn');

            let joyId = null, lookId = null;
            let joyStart = { x: 0, y: 0 }, lastLook = { x: 0, y: 0 };

            actionBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleMarkerAction(); });

            joyZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                joyId = touch.identifier;
                joyStart = { x: touch.clientX, y: touch.clientY };

                joyBase.style.display = 'block';
                joyBase.style.left = touch.clientX + 'px';
                joyBase.style.top = touch.clientY + 'px';
                joyThumb.style.transform = `translate(-50%, -50%)`;
                joyDelta = { x: 0, y: 0 };
            });

            joyZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let touch of e.changedTouches) {
                    if (touch.identifier === joyId) {
                        let dx = touch.clientX - joyStart.x;
                        let dy = touch.clientY - joyStart.y;
                        const maxDist = 40;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist > maxDist) {
                            dx = (dx / dist) * maxDist;
                            dy = (dy / dist) * maxDist;
                        }

                        joyThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

                        joyDelta.x = dx / maxDist;
                        joyDelta.y = dy / maxDist;
                    }
                }
            });

            const endJoy = (e) => {
                e.preventDefault();
                for (let touch of e.changedTouches) {
                    if (touch.identifier === joyId) {
                        joyId = null;
                        joyBase.style.display = 'none';
                        joyDelta = { x: 0, y: 0 };
                    }
                }
            };
            joyZone.addEventListener('touchend', endJoy);
            joyZone.addEventListener('touchcancel', endJoy);

            lookZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                lookId = touch.identifier;
                lastLook = { x: touch.clientX, y: touch.clientY };
            });

            lookZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let touch of e.changedTouches) {
                    if (touch.identifier === lookId) {
                        const deltaX = touch.clientX - lastLook.x;
                        const deltaY = touch.clientY - lastLook.y;
                        lastLook = { x: touch.clientX, y: touch.clientY };

                        const lookSpeed = 0.006;
                        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
                        euler.setFromQuaternion(camera.quaternion);

                        euler.y -= deltaX * lookSpeed;
                        euler.x -= deltaY * lookSpeed;
                        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

                        camera.quaternion.setFromEuler(euler);
                    }
                }
            });

            const endLook = (e) => {
                e.preventDefault();
                for (let touch of e.changedTouches) {
                    if (touch.identifier === lookId) lookId = null;
                }
            };
            lookZone.addEventListener('touchend', endLook);
            lookZone.addEventListener('touchcancel', endLook);
        }

        function startTimer() {
            if (!startTime) {
                startTime = Date.now();
                timerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
                    const s = String(elapsed % 60).padStart(2, '0');
                    document.getElementById('timer-display').innerText = `${m}:${s}`;
                }, 1000);
            }
        }

        function onKeyDown(e) {
            switch (e.code) {
                case 'ArrowUp': case 'KeyW': moveForward = true; break;
                case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
                case 'ArrowDown': case 'KeyS': moveBackward = true; break;
                case 'ArrowRight': case 'KeyD': moveRight = true; break;
            }
        }

        function onKeyUp(e) {
            switch (e.code) {
                case 'ArrowUp': case 'KeyW': moveForward = false; break;
                case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
                case 'ArrowDown': case 'KeyS': moveBackward = false; break;
                case 'ArrowRight': case 'KeyD': moveRight = false; break;
            }
        }

        // --- 맵 생성 및 3D 빌드 ---
        function generateMaze() {
            maze = Array(MAZE_SIZE).fill().map(() => Array(MAZE_SIZE).fill(1));
            function carve(x, z) {
                maze[z][x] = 0;
                const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);
                for (let i = 0; i < dirs.length; i++) {
                    const nx = x + dirs[i][0], nz = z + dirs[i][1];
                    if (nx > 0 && nx < MAZE_SIZE - 1 && nz > 0 && nz < MAZE_SIZE - 1 && maze[nz][nx] === 1) {
                        maze[z + dirs[i][1] / 2][x + dirs[i][0] / 2] = 0;
                        carve(nx, nz);
                    }
                }
            }
            carve(1, 1);

            const LOOP_CHANCE = 0.08;
            for (let z = 1; z < MAZE_SIZE - 1; z++) {
                for (let x = 1; x < MAZE_SIZE - 1; x++) {
                    if (maze[z][x] === 1) {
                        if (maze[z][x - 1] === 0 && maze[z][x + 1] === 0 && maze[z - 1][x] === 1 && maze[z + 1][x] === 1) {
                            if (Math.random() < LOOP_CHANCE) maze[z][x] = 0;
                        } else if (maze[z - 1][x] === 0 && maze[z + 1][x] === 0 && maze[z][x - 1] === 1 && maze[z][x + 1] === 1) {
                            if (Math.random() < LOOP_CHANCE) maze[z][x] = 0;
                        }
                    }
                }
            }
            maze[1][1] = 0; maze[1][2] = 0; maze[2][1] = 0;
            maze[MAZE_SIZE - 2][MAZE_SIZE - 2] = 2; maze[MAZE_SIZE - 2][MAZE_SIZE - 3] = 0; maze[MAZE_SIZE - 3][MAZE_SIZE - 2] = 0;
        }

        function build3DMaze() {
            const wallGeo = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE);
            const wallMat = new THREE.MeshStandardMaterial({
                map: createWallTexture(),
                roughness: 0.9,
                metalness: 0.1
            });

            for (let z = 0; z < MAZE_SIZE; z++) {
                for (let x = 0; x < MAZE_SIZE; x++) {
                    if (maze[z][x] === 1) {
                        const wall = new THREE.Mesh(wallGeo, wallMat);
                        wall.position.set(x * CELL_SIZE, WALL_HEIGHT / 2, z * CELL_SIZE);
                        mazeGroup.add(wall); // scene 대신 mazeGroup에 추가
                        walls.push(wall);
                    } else if (maze[z][x] === 2) {
                        const exitGeo = new THREE.TorusKnotGeometry(CELL_SIZE / 3, CELL_SIZE / 10, 100, 16);
                        const exitMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
                        exitMesh = new THREE.Mesh(exitGeo, exitMat);
                        exitMesh.position.set(x * CELL_SIZE, PLAYER_HEIGHT, z * CELL_SIZE);
                        mazeGroup.add(exitMesh); // scene 대신 mazeGroup에 추가

                        const exitLight = new THREE.PointLight(0x00f0ff, 2, CELL_SIZE * 3);
                        exitLight.position.copy(exitMesh.position);
                        mazeGroup.add(exitLight); // scene 대신 mazeGroup에 추가
                    }
                }
            }

            // 시야 위치 및 회전 초기화
            camera.position.set(1 * CELL_SIZE, PLAYER_HEIGHT, 1 * CELL_SIZE);
            camera.rotation.set(0, -Math.PI / 2, 0);
        }

        function checkCollision(pos, dx, dz) {
            let nextX = pos.x + dx, nextZ = pos.z + dz;
            const getGrid = (val) => Math.round(val / CELL_SIZE);

            let gridX = getGrid(nextX + (dx > 0 ? PLAYER_SIZE : -PLAYER_SIZE));
            let gridZ = getGrid(pos.z);
            if (gridZ >= 0 && gridZ < MAZE_SIZE && gridX >= 0 && gridX < MAZE_SIZE && maze[gridZ][gridX] === 1) dx = 0;

            gridX = getGrid(pos.x);
            gridZ = getGrid(nextZ + (dz > 0 ? PLAYER_SIZE : -PLAYER_SIZE));
            if (gridZ >= 0 && gridZ < MAZE_SIZE && gridX >= 0 && gridX < MAZE_SIZE && maze[gridZ][gridX] === 1) dz = 0;

            return { dx, dz };
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            requestAnimationFrame(animate);
            if (gameWon || !gameStarted) {
                if (gameStarted) renderer.render(scene, camera);
                return;
            }

            const time = performance.now();
            const delta = Math.min((time - prevTime) / 1000, 0.1);
            prevTime = time;

            let inputX = 0, inputZ = 0;
            if (isMobile) {
                inputX = joyDelta.x;
                inputZ = joyDelta.y;
            } else {
                if (moveForward) inputZ -= 1;
                if (moveBackward) inputZ += 1;
                if (moveLeft) inputX -= 1;
                if (moveRight) inputX += 1;
            }

            const localMove = new THREE.Vector3(inputX, 0, inputZ);
            if (localMove.lengthSq() > 1) localMove.normalize();

            const euler = new THREE.Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(camera.quaternion);
            euler.x = 0;
            euler.z = 0;

            localMove.applyEuler(euler);

            if (inputX !== 0 || inputZ !== 0) {
                let dx = localMove.x * PLAYER_SPEED * delta;
                let dz = localMove.z * PLAYER_SPEED * delta;

                const allowedMove = checkCollision(camera.position, dx, dz);
                camera.position.x += allowedMove.dx;
                camera.position.z += allowedMove.dz;
            }
            camera.position.y = PLAYER_HEIGHT;

            if (exitMesh) {
                exitMesh.rotation.x += 1 * delta;
                exitMesh.rotation.y += 2 * delta;
                if (camera.position.distanceTo(exitMesh.position) < CELL_SIZE) {
                    gameWon = true;
                    clearInterval(timerInterval);
                    document.getElementById('final-time').innerText = document.getElementById('timer-display').innerText;

                    if (!isMobile) controls.unlock();
                    document.getElementById('mobile-ui').style.display = 'none';
                    document.getElementById('crosshair').style.display = 'none';
                    document.getElementById('blocker').style.display = 'none';
                    document.getElementById('win-screen').style.display = 'flex';
                }
            }

            renderer.render(scene, camera);
        }
