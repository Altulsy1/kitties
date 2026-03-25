// constants
const EMPTY = 0;
const PLAYER1 = 1; // red
const PLAYER2 = 2; // blue

// state
let board = [];
let currentPlayer = PLAYER1;
let selectedCell = null;
let gameOver = false;
let lastMoveWasJump = false;
let currentJumpChainCell = null;

// game mode: 'pvp' or 'pvc'
let gameMode = 'pvp';
let computerTimeout = null;

// ألوان اللاعبين في وضع pvc
let humanPlayer = PLAYER1; // اللاعب البشري (افتراضي أحمر)
let computerPlayer = PLAYER2; // الكمبيوتر

// مراحل اللعبة: 'dropping' أو 'moving'
let phase = 'moving'; // افتراضي: moving للوضع الكلاسيكي

// عدد الأحجار المتبقية للوضع (في وضع dropping)
let remainingToPlace1 = 0;
let remainingToPlace2 = 0;

// نوع الإعداد المبدئي: 'classic' أو 'dropping'
let initialSetup = 'classic';

// نظام الصوت المحسّن
let audioCtx = null;
let isMuted = false;

// نظام الترجمة
let currentLanguage = 'ar'; // 'ar' or 'en'
const translations = {
    ar: {
        gameTitle: '🎮 لعبة قفزة الكلب',
        setupClassic: 'وضع كلاسيكي',
        setupDropping: 'وضع حديث',
        modePvp: 'لاعب ضد لاعب',
        modePvc: 'لاعب ضد كمبيوتر',
        chooseColor: 'اختر لونك:',
        colorRed: 'أحمر',
        colorBlue: 'أزرق',
        reset: 'لعبة جديدة',
        about: 'من نحن',
        mute: 'كتم الصوت',
        unmute: 'تشغيل الصوت',
        aboutTitle: 'معلومات المطور',
        aboutNameLabel: 'الاسم:',
        aboutEmailLabel: 'البريد الإلكتروني:',
        turnRed: '🔴 دور الأحمر',
        turnBlue: '🔵 دور الأزرق',
        turnRedDrop: '🔴 دور الأحمر (وضع)',
        turnBlueDrop: '🔵 دور الأزرق (وضع)',
        turnYour: '👤 دورك',
        turnComputer: '💻 دور الكمبيوتر',
        turnYourDrop: '👤 دورك (وضع)',
        turnComputerDrop: '💻 دور الكمبيوتر (وضع)',
        winnerRed: '🏆 اللاعب الأحمر فاز! 🏆',
        winnerBlue: '🏆 اللاعب الأزرق فاز! 🏆',
        winnerYou: '🎉 لقد فزت! 🎉',
        winnerComputer: '💻 الكمبيوتر فاز! 💻',
        winnerRedShort: '🔴 فاز الأحمر',
        winnerBlueShort: '🔵 فاز الأزرق',
        winnerYouShort: '🎉 أنت الفائز!',
        winnerComputerShort: '💻 الكمبيوتر فاز',
    },
    en: {
        gameTitle: '🎮 Dog Jump Game',
        setupClassic: 'Classic Mode',
        setupDropping: 'Modern Mode',
        modePvp: 'Player vs Player',
        modePvc: 'Player vs Computer',
        chooseColor: 'Choose your color:',
        colorRed: 'Red',
        colorBlue: 'Blue',
        reset: 'New Game',
        about: 'About Us',
        mute: 'Mute',
        unmute: 'Unmute',
        aboutTitle: 'Developer Info',
        aboutNameLabel: 'Name:',
        aboutEmailLabel: 'Email:',
        turnRed: '🔴 Red\'s turn',
        turnBlue: '🔵 Blue\'s turn',
        turnRedDrop: '🔴 Red\'s turn (placing)',
        turnBlueDrop: '🔵 Blue\'s turn (placing)',
        turnYour: '👤 Your turn',
        turnComputer: '💻 Computer\'s turn',
        turnYourDrop: '👤 Your turn (placing)',
        turnComputerDrop: '💻 Computer\'s turn (placing)',
        winnerRed: '🏆 Red player wins! 🏆',
        winnerBlue: '🏆 Blue player wins! 🏆',
        winnerYou: '🎉 You win! 🎉',
        winnerComputer: '💻 Computer wins! 💻',
        winnerRedShort: '🔴 Red wins',
        winnerBlueShort: '🔵 Blue wins',
        winnerYouShort: '🎉 You win!',
        winnerComputerShort: '💻 Computer wins',
    }
};

// إنشاء ضوضاء بيضاء قصيرة (لكل الأصوات التي تحتاج noise)
function createNoiseBuffer(duration = 0.2) {
    if (!audioCtx) return null;
    const sampleRate = audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

// دالة عامة لتشغيل الأصوات
function playSound({ type = 'sine', frequencies = [600], duration = 0.15, volume = 0.15, useNoise = false, noiseVolume = 0.05 } = {}) {
    if (isMuted) return;
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // استئناف السياق إذا كان معلقاً (للمتصفحات التي تمنع التشغيل التلقائي)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (audioCtx.state !== 'running') return;

    const now = audioCtx.currentTime;
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // إذا طُلب ضوضاء، نخلطها مع الصوت الرئيسي
    if (useNoise) {
        const noiseBuffer = createNoiseBuffer(duration);
        if (noiseBuffer) {
            const noiseSource = audioCtx.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            const noiseGain = audioCtx.createGain();
            noiseGain.gain.value = noiseVolume;
            noiseSource.connect(noiseGain);
            noiseGain.connect(gainNode);
            noiseSource.start(now);
            noiseSource.stop(now + duration);
            // تحرير مصدر الضوضاء بعد الانتهاء
            noiseSource.onended = () => {
                noiseSource.disconnect();
                noiseGain.disconnect();
            };
        }
    }

    // إنشاء المذبذبات حسب عدد الترددات
    const oscillators = frequencies.map(freq => {
        const osc = audioCtx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + duration);
        return osc;
    });

    // توصيل الـ gain النهائي بالإخراج
    gainNode.connect(audioCtx.destination);

    // تحرير جميع العقد بعد الانتهاء
    setTimeout(() => {
        gainNode.disconnect();
        oscillators.forEach(osc => osc.disconnect());
    }, duration * 1000 + 50);
}

// أصوات محدثة
function playMoveSound() {
    playSound({
        type: 'sine',
        frequencies: [880, 1320],
        duration: 0.15,
        volume: 0.12
    });
}

function playCaptureSound() {
    playSound({
        type: 'sawtooth',
        frequencies: [200],
        duration: 0.25,
        volume: 0.2,
        useNoise: true,
        noiseVolume: 0.03
    });
}

function playErrorSound() {
    playSound({
        type: 'triangle',
        frequencies: [300, 240],
        duration: 0.18,
        volume: 0.1
    });
}

function playWinSound() {
    playSound({
        type: 'triangle',
        frequencies: [523.25, 659.25, 783.99], // دو - مي - صول
        duration: 0.6,
        volume: 0.25
    });
}

// DOM elements
const boardDiv = document.getElementById('board');
const player1CountSpan = document.getElementById('player1-count');
const player2CountSpan = document.getElementById('player2-count');
const turnIndicator = document.getElementById('turn-indicator');
const winnerMsg = document.getElementById('winner-message');
const resetBtn = document.getElementById('resetBtn');
const aboutBtn = document.getElementById('aboutBtn');
const muteBtn = document.getElementById('muteBtn');
const aboutModal = document.getElementById('aboutModal');
const closeBtn = document.querySelector('.close-btn');

// أزرار وضع اللعبة (لاعب ضد لاعب / كمبيوتر)
const pvpBtn = document.getElementById('pvpBtn');
const pvcBtn = document.getElementById('pvcBtn');

// أزرار نوع الإعداد المبدئي (كلاسيكي / وضع القطع)
const classicSetupBtn = document.getElementById('classicSetupBtn');
const droppingSetupBtn = document.getElementById('droppingSetupBtn');

// عناصر اختيار اللون (تظهر فقط في وضع pvc)
const colorChoiceDiv = document.getElementById('colorChoice');
const chooseRedBtn = document.getElementById('chooseRed');
const chooseBlueBtn = document.getElementById('chooseBlue');

// زر تبديل اللغة
const langToggle = document.getElementById('langToggle');

// دوال الترجمة
function updateUILanguage() {
    const t = translations[currentLanguage];
    document.getElementById('game-title').textContent = t.gameTitle;
    document.getElementById('setup-classic-text').textContent = t.setupClassic;
    document.getElementById('setup-dropping-text').textContent = t.setupDropping;
    document.getElementById('mode-pvp-text').textContent = t.modePvp;
    document.getElementById('mode-pvc-text').textContent = t.modePvc;
    document.getElementById('choose-color-label').textContent = t.chooseColor;
    document.getElementById('color-red-text').textContent = t.colorRed;
    document.getElementById('color-blue-text').textContent = t.colorBlue;
    document.getElementById('reset-text').textContent = t.reset;
    document.getElementById('about-text').textContent = t.about;
    const muteText = document.getElementById('mute-text');
    muteText.textContent = isMuted ? t.unmute : t.mute;
    document.getElementById('about-title').textContent = t.aboutTitle;
    document.getElementById('about-name-label').textContent = t.aboutNameLabel;
    document.getElementById('about-email-label').textContent = t.aboutEmailLabel;

    // تحديث مؤشر الدور ورسالة الفوز إذا كانت اللعبة منتهية
    if (gameOver) {
        updateWinnerMessage();
    } else {
        updateTurnIndicator();
    }

    // تغيير اتجاه الصفحة
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
}

function updateTurnIndicator() {
    const t = translations[currentLanguage];
    if (gameOver) return;
    if (phase === 'dropping') {
        if (gameMode === 'pvp') {
            turnIndicator.innerHTML = currentPlayer === PLAYER1 ? t.turnRedDrop : t.turnBlueDrop;
        } else {
            turnIndicator.innerHTML = currentPlayer === humanPlayer ? t.turnYourDrop : t.turnComputerDrop;
        }
    } else {
        if (gameMode === 'pvp') {
            turnIndicator.innerHTML = currentPlayer === PLAYER1 ? t.turnRed : t.turnBlue;
        } else {
            turnIndicator.innerHTML = currentPlayer === humanPlayer ? t.turnYour : t.turnComputer;
        }
    }
}

function updateWinnerMessage() {
    const t = translations[currentLanguage];
    if (!gameOver) return;
    // تم تحديد winner مسبقاً في applyVictoryEffects
    // نحدث النص حسب winner
    if (gameMode === 'pvp') {
        // winner موجود في متغير غير محفوظ، نستنتجه من turnIndicator أو نحفظه. سنحفظه في متغير عند الفوز.
        if (window._winnerPlayer) {
            turnIndicator.innerHTML = window._winnerPlayer === PLAYER1 ? t.winnerRedShort : t.winnerBlueShort;
            winnerMsg.textContent = window._winnerPlayer === PLAYER1 ? t.winnerRed : t.winnerBlue;
        }
    } else {
        if (window._winnerPlayer === humanPlayer) {
            turnIndicator.innerHTML = t.winnerYouShort;
            winnerMsg.textContent = t.winnerYou;
        } else {
            turnIndicator.innerHTML = t.winnerComputerShort;
            winnerMsg.textContent = t.winnerComputer;
        }
    }
}

// تعديل applyVictoryEffects لحفظ الفائز
function applyVictoryEffects(winner) {
    gameOver = true;
    window._winnerPlayer = winner;
    playWinSound(); // تشغيل نغمة الفوز
    updateWinnerMessage(); // تستخدم window._winnerPlayer
    boardDiv.classList.add('victory-glow');
}

// تعديل renderBoard لاستخدام دوال الترجمة
function renderBoard() {
    boardDiv.innerHTML = '';

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${r}-${c}`;
            cell.dataset.row = r;
            cell.dataset.col = c;

            const stone = document.createElement('span');
            stone.className = 'stone';
            if (board[r][c] === PLAYER1) {
                stone.classList.add('player1-stone');
            } else if (board[r][c] === PLAYER2) {
                stone.classList.add('player2-stone');
            } else {
                stone.classList.add('empty-stone');
            }
            cell.appendChild(stone);

            if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
                cell.classList.add('selected');
            }

            cell.addEventListener('click', () => handleCellClick(r, c));
            boardDiv.appendChild(cell);
        }
    }

    if (!gameOver) {
        updateTurnIndicator();
    }

    updateCounters();

    if (gameMode === 'pvc' && currentPlayer === computerPlayer && !gameOver) {
        if (computerTimeout) clearTimeout(computerTimeout);
        computerTimeout = setTimeout(() => computerMove(), 500);
    }
}

// ... باقي دوال اللعبة (countStones, isValidSimpleMove, isValidJump, makeMove, hasAvailableJump, checkWinner, removeVictoryEffects, getAllPossibleMoves, computerMove, executeComputerMove, handleCellClick) تبقى كما هي دون تغيير ...

// ولكن يجب تعديل resetGame لتعيين currentPlayer بشكل صحيح واستدعاء updateUILanguage بعد التغييرات
function resetGame(humanColor = PLAYER1, setupMode = initialSetup) {
    if (setupMode === 'classic') {
        // اللوحة الكلاسيكية (كما كانت سابقاً)
        board = [
            [PLAYER1, PLAYER1, PLAYER1, PLAYER1, PLAYER1],
            [PLAYER1, PLAYER1, PLAYER1, PLAYER1, PLAYER1],
            [PLAYER1, PLAYER1, EMPTY, PLAYER2, PLAYER2],
            [PLAYER2, PLAYER2, PLAYER2, PLAYER2, PLAYER2],
            [PLAYER2, PLAYER2, PLAYER2, PLAYER2, PLAYER2]
        ];
        phase = 'moving';
        remainingToPlace1 = 0;
        remainingToPlace2 = 0;
    } else {
        // وضع وضع القطع: لوحة فارغة
        initBoard();
        phase = 'dropping';
        remainingToPlace1 = 12;
        remainingToPlace2 = 12;
    }

    if (gameMode === 'pvp') {
        currentPlayer = PLAYER1;
        humanPlayer = null;
        computerPlayer = null;
    } else {
        humanPlayer = humanColor;
        computerPlayer = (humanPlayer === PLAYER1) ? PLAYER2 : PLAYER1;
        currentPlayer = humanPlayer;
    }

    selectedCell = null;
    gameOver = false;
    lastMoveWasJump = false;
    currentJumpChainCell = null;
    removeVictoryEffects();
    winnerMsg.textContent = '';
    if (computerTimeout) clearTimeout(computerTimeout);
    window._winnerPlayer = null;
    updateUILanguage(); // تحديث اللغة بعد إعادة التعيين
    renderBoard();
}

// إضافة دالة initBoard (كانت موجودة)
function initBoard() {
    board = [
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
    ];
}

function countStones(player) {
    let count = 0;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (board[r][c] === player) count++;
        }
    }
    return count;
}

function updateCounters() {
    if (phase === 'dropping') {
        player1CountSpan.textContent = remainingToPlace1;
        player2CountSpan.textContent = remainingToPlace2;
    } else {
        player1CountSpan.textContent = countStones(PLAYER1);
        player2CountSpan.textContent = countStones(PLAYER2);
    }
}

function isValidSimpleMove(startRow, startCol, endRow, endCol) {
    if (board[startRow][startCol] !== currentPlayer) return false;
    if (board[endRow][endCol] !== EMPTY) return false;
    const rowDiff = Math.abs(startRow - endRow);
    const colDiff = Math.abs(startCol - endCol);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

function isValidJump(startRow, startCol, endRow, endCol) {
    if (board[startRow][startCol] !== currentPlayer) return false;
    if (board[endRow][endCol] !== EMPTY) return false;
    const rowDiff = Math.abs(startRow - endRow);
    const colDiff = Math.abs(startCol - endCol);
    if (!((rowDiff === 2 && colDiff === 0) || (rowDiff === 0 && colDiff === 2))) return false;

    const midRow = (startRow + endRow) / 2;
    const midCol = (startCol + endCol) / 2;
    const opponent = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
    return board[midRow][midCol] === opponent;
}

function makeMove(startRow, startCol, endRow, endCol) {
    let wasJump = false;
    if (isValidJump(startRow, startCol, endRow, endCol)) {
        const midRow = (startRow + endRow) / 2;
        const midCol = (startCol + endCol) / 2;
        board[midRow][midCol] = EMPTY;
        wasJump = true;
        playCaptureSound();
    } else {
        playMoveSound();
    }

    board[startRow][startCol] = EMPTY;
    board[endRow][endCol] = currentPlayer;
    return wasJump;
}

function hasAvailableJump(row, col, player) {
    const directions = [
        [-2, 0], [2, 0], [0, -2], [0, 2]
    ];
    const opponent = player === PLAYER1 ? PLAYER2 : PLAYER1;
    for (let [dr, dc] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] === EMPTY) {
            const midRow = (row + nr) / 2;
            const midCol = (col + nc) / 2;
            if (board[midRow][midCol] === opponent) {
                return true;
            }
        }
    }
    return false;
}

function checkWinner() {
    if (countStones(PLAYER1) === 0) return PLAYER2;
    if (countStones(PLAYER2) === 0) return PLAYER1;
    return null;
}

function removeVictoryEffects() {
    boardDiv.classList.remove('victory-glow');
}

function getAllPossibleMoves(player) {
    const moves = [];
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (board[r][c] === player) {
                const simpleDirs = [[-1,0],[1,0],[0,-1],[0,1]];
                for (let [dr, dc] of simpleDirs) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] === EMPTY) {
                        moves.push({ startRow: r, startCol: c, endRow: nr, endCol: nc, isJump: false });
                    }
                }
                const jumpDirs = [[-2,0],[2,0],[0,-2],[0,2]];
                for (let [dr, dc] of jumpDirs) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] === EMPTY) {
                        const midRow = (r + nr) / 2;
                        const midCol = (c + nc) / 2;
                        const opponent = player === PLAYER1 ? PLAYER2 : PLAYER1;
                        if (board[midRow][midCol] === opponent) {
                            moves.push({ startRow: r, startCol: c, endRow: nr, endCol: nc, isJump: true });
                        }
                    }
                }
            }
        }
    }
    return moves;
}

function computerMove() {
    if (gameOver) return;
    if (phase === 'dropping' && currentPlayer !== computerPlayer) return;
    if (phase === 'moving' && currentPlayer !== computerPlayer) return;

    if (phase === 'dropping') {
        // وضع حجر في خلية عشوائية فارغة
        const emptyCells = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (board[r][c] === EMPTY) emptyCells.push({ row: r, col: c });
            }
        }
        if (emptyCells.length === 0) return;

        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[randomCell.row][randomCell.col] = computerPlayer;
        if (computerPlayer === PLAYER1) {
            remainingToPlace1--;
        } else {
            remainingToPlace2--;
        }
        playMoveSound();

        if (remainingToPlace1 === 0 && remainingToPlace2 === 0) {
            phase = 'moving';
            lastMoveWasJump = false;
            currentJumpChainCell = null;
            selectedCell = null;
        } else {
            currentPlayer = (computerPlayer === PLAYER1) ? PLAYER2 : PLAYER1;
        }

        renderBoard();

        if (phase === 'dropping' && currentPlayer === computerPlayer && !gameOver) {
            computerTimeout = setTimeout(() => computerMove(), 500);
        }
        return;
    }

    // مرحلة التحرك
    if (lastMoveWasJump && currentJumpChainCell) {
        const { row, col } = currentJumpChainCell;
        const jumpMoves = [];
        const jumpDirs = [[-2,0],[2,0],[0,-2],[0,2]];
        for (let [dr, dc] of jumpDirs) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] === EMPTY) {
                const midRow = (row + nr) / 2;
                const midCol = (col + nc) / 2;
                if (board[midRow][midCol] === humanPlayer) {
                    jumpMoves.push({ startRow: row, startCol: col, endRow: nr, endCol: nc, isJump: true });
                }
            }
        }
        if (jumpMoves.length > 0) {
            const move = jumpMoves[Math.floor(Math.random() * jumpMoves.length)];
            executeComputerMove(move);
            return;
        } else {
            lastMoveWasJump = false;
            currentJumpChainCell = null;
            selectedCell = null;
            currentPlayer = humanPlayer;
            renderBoard();
            return;
        }
    }

    const moves = getAllPossibleMoves(computerPlayer);
    if (moves.length === 0) return;

    const jumpMoves = moves.filter(m => m.isJump);
    const simpleMoves = moves.filter(m => !m.isJump);

    let selectedMove = null;
    if (jumpMoves.length > 0) {
        selectedMove = jumpMoves[Math.floor(Math.random() * jumpMoves.length)];
    } else {
        selectedMove = simpleMoves[Math.floor(Math.random() * simpleMoves.length)];
    }

    executeComputerMove(selectedMove);
}

function executeComputerMove(move) {
    const wasJump = makeMove(move.startRow, move.startCol, move.endRow, move.endCol);

    if (wasJump) {
        if (hasAvailableJump(move.endRow, move.endCol, computerPlayer)) {
            lastMoveWasJump = true;
            currentJumpChainCell = { row: move.endRow, col: move.endCol };
            selectedCell = { row: move.endRow, col: move.endCol };
        } else {
            lastMoveWasJump = false;
            currentJumpChainCell = null;
            selectedCell = null;
            currentPlayer = humanPlayer;
        }
    } else {
        lastMoveWasJump = false;
        currentJumpChainCell = null;
        selectedCell = null;
        currentPlayer = humanPlayer;
    }

    const winner = checkWinner();
    if (winner) {
        applyVictoryEffects(winner);
    }

    renderBoard();
}

function handleCellClick(row, col) {
    if (gameOver) return;

    if (gameMode === 'pvc' && humanPlayer === null) {
        alert('الرجاء اختيار لونك أولاً / Please choose your color first');
        return;
    }

    if (gameMode === 'pvc' && currentPlayer === computerPlayer) return;

    // مرحلة وضع الأحجار
    if (phase === 'dropping') {
        if (board[row][col] !== EMPTY) {
            playErrorSound();
            return;
        }

        // التحقق من وجود أحجار متبقية للاعب الحالي
        if (currentPlayer === PLAYER1 && remainingToPlace1 <= 0) {
            playErrorSound();
            return;
        }
        if (currentPlayer === PLAYER2 && remainingToPlace2 <= 0) {
            playErrorSound();
            return;
        }

        // وضع الحجر
        board[row][col] = currentPlayer;
        if (currentPlayer === PLAYER1) {
            remainingToPlace1--;
        } else {
            remainingToPlace2--;
        }
        playMoveSound();

        // التحقق من انتهاء مرحلة الوضع
        if (remainingToPlace1 === 0 && remainingToPlace2 === 0) {
            phase = 'moving';
            // إعادة تعيين متغيرات القفزات
            lastMoveWasJump = false;
            currentJumpChainCell = null;
            selectedCell = null;
        } else {
            // التبديل إلى اللاعب الآخر
            currentPlayer = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
        }

        renderBoard();

        // إذا كان دور الكمبيوتر بعد التبديل، قم بتشغيل حركته
        if (gameMode === 'pvc' && currentPlayer === computerPlayer && !gameOver) {
            if (computerTimeout) clearTimeout(computerTimeout);
            computerTimeout = setTimeout(() => computerMove(), 500);
        }
        return;
    }

    // مرحلة التحرك (نفس الكود السابق)
    if (lastMoveWasJump && currentJumpChainCell) {
        if (selectedCell) {
            if (selectedCell.row === currentJumpChainCell.row && selectedCell.col === currentJumpChainCell.col) {
                if (isValidJump(selectedCell.row, selectedCell.col, row, col)) {
                    const wasJump = makeMove(selectedCell.row, selectedCell.col, row, col);
                    currentJumpChainCell = { row, col };
                    selectedCell = { row, col };
                    if (!hasAvailableJump(row, col, currentPlayer)) {
                        lastMoveWasJump = false;
                        currentJumpChainCell = null;
                        selectedCell = null;
                        currentPlayer = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
                    }
                    renderBoard();
                    return;
                } else {
                    playErrorSound();
                }
            } else {
                playErrorSound();
            }
        } else {
            selectedCell = { row: currentJumpChainCell.row, col: currentJumpChainCell.col };
            renderBoard();
        }
        return;
    }

    if (selectedCell) {
        const sRow = selectedCell.row;
        const sCol = selectedCell.col;

        if (sRow === row && sCol === col) {
            selectedCell = null;
            renderBoard();
            return;
        }

        if (isValidSimpleMove(sRow, sCol, row, col) || isValidJump(sRow, sCol, row, col)) {
            const wasJump = makeMove(sRow, sCol, row, col);
            selectedCell = null;

            if (wasJump) {
                if (hasAvailableJump(row, col, currentPlayer)) {
                    lastMoveWasJump = true;
                    currentJumpChainCell = { row, col };
                    selectedCell = { row, col };
                } else {
                    lastMoveWasJump = false;
                    currentJumpChainCell = null;
                    currentPlayer = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
                }
            } else {
                lastMoveWasJump = false;
                currentJumpChainCell = null;
                currentPlayer = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
            }

            const winner = checkWinner();
            if (winner) {
                applyVictoryEffects(winner);
            }
            renderBoard();
        } else {
            playErrorSound();
            if (board[row][col] === currentPlayer) {
                selectedCell = { row, col };
            } else {
                selectedCell = null;
            }
            renderBoard();
        }
    } else {
        if (board[row][col] === currentPlayer) {
            if (lastMoveWasJump && currentJumpChainCell) {
                playErrorSound();
                return;
            }
            selectedCell = { row, col };
            renderBoard();
        }
    }
}

// تبديل وضع اللعبة (pvp/pvc)
pvpBtn.addEventListener('click', () => {
    pvpBtn.classList.add('active');
    pvcBtn.classList.remove('active');
    gameMode = 'pvp';
    colorChoiceDiv.style.display = 'none';
    resetGame(PLAYER1, initialSetup);
});

pvcBtn.addEventListener('click', () => {
    pvpBtn.classList.remove('active');
    pvcBtn.classList.add('active');
    gameMode = 'pvc';
    colorChoiceDiv.style.display = 'flex';
    resetGame(PLAYER1, initialSetup);
});

// اختيار اللون في وضع pvc
chooseRedBtn.addEventListener('click', () => {
    if (gameMode === 'pvc') {
        resetGame(PLAYER1, initialSetup);
    }
});

chooseBlueBtn.addEventListener('click', () => {
    if (gameMode === 'pvc') {
        resetGame(PLAYER2, initialSetup);
    }
});

// أزرار نوع الإعداد المبدئي
classicSetupBtn.addEventListener('click', () => {
    classicSetupBtn.classList.add('active');
    droppingSetupBtn.classList.remove('active');
    initialSetup = 'classic';
    resetGame(gameMode === 'pvc' ? humanPlayer : PLAYER1, initialSetup);
});

droppingSetupBtn.addEventListener('click', () => {
    droppingSetupBtn.classList.add('active');
    classicSetupBtn.classList.remove('active');
    initialSetup = 'dropping';
    resetGame(gameMode === 'pvc' ? humanPlayer : PLAYER1, initialSetup);
});

// زر إعادة التعيين
resetBtn.addEventListener('click', () => {
    if (gameMode === 'pvp') {
        resetGame(PLAYER1, initialSetup);
    } else {
        resetGame(humanPlayer || PLAYER1, initialSetup);
    }
});

// كتم الصوت
muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    const icon = muteBtn.querySelector('.icon');
    const text = muteBtn.querySelector('.btn-text');
    const t = translations[currentLanguage];
    if (isMuted) {
        icon.textContent = '🔇';
        text.textContent = t.unmute;
    } else {
        icon.textContent = '🔊';
        text.textContent = t.mute;
    }
});

// من نحن
aboutBtn.addEventListener('click', () => {
    aboutModal.classList.add('show');
});

closeBtn.addEventListener('click', () => {
    aboutModal.classList.remove('show');
});

window.addEventListener('click', (event) => {
    if (event.target === aboutModal) {
        aboutModal.classList.remove('show');
    }
});

// زر تبديل اللغة
langToggle.addEventListener('click', () => {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    updateUILanguage();
});

// تهيئة أولية
initBoard();
gameMode = 'pvp';
pvpBtn.classList.add('active');
pvcBtn.classList.remove('active');
classicSetupBtn.classList.add('active');
droppingSetupBtn.classList.remove('active');
colorChoiceDiv.style.display = 'none';
resetGame(PLAYER1, 'classic');