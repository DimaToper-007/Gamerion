/* ==========================================================
   AEROSTRIKE: TACTICAL APEX v45.0 (МАСШТАБНЫЙ КОД НА РУССКОМ)
   - Усиленные маневрирующие мобы с высоким здоровьем и уворотами
   - Расширенный арсенал из 10 уникальных бафов и улучшений
   - Процедурные боссы, динамичные фоны секторов, реалистичные взрывы
   ========================================================== */

const menuScreen = document.getElementById('menuScreen');
const playScreen = document.getElementById('playScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const healthBarFill = document.getElementById('healthBarFill');
const evolutionBarFill = document.getElementById('evolutionBarFill');
const tierLabel = document.getElementById('tierLabel');
const scoreEl = document.getElementById('gameScore');
const ammoLabel = document.getElementById('ammoLabel');
const waveEl = document.getElementById('gameWave');
const finalScoreEl = document.getElementById('finalScore');
const finalWaveEl = document.getElementById('finalWave');
const powerupStatus = document.getElementById('powerupStatus');

const bossHudContainer = document.getElementById('bossHudContainer');
const bossBarFill = document.getElementById('bossBarFill');
const bossNameEl = document.getElementById('bossName');
const bossHpText = document.getElementById('bossHpText');

let gameActive = false;
let currentDifficulty = 'medium';
let selectedSkin = 'cyan';
let score = 0;
let wave = 1;
let sectorHealthDrops = 0; // Лимит аптечек за сектор (1-2 макс)

let player = {
    x: 480,
    y: 420,
    width: 44,
    height: 52,
    speed: 4.2,
    hp: 180,
    maxHp: 180,
    tier: 1, // От 1 до 5 фазы эволюции
    evolutionPoints: 0,
    evolutionMax: 80,
    isDragging: false,
    critChance: 0.15
};

let keys = {};
let bullets = [];
let enemies = [];
let enemyBullets = [];
let particles = [];
let shockwaves = [];
let stars = [];
let evolutionCores = [];
let ammoPickups = [];
let floatingTexts = [];

// 10 УНИКАЛЬНЫХ ТИПОВ БАФОВ И ОРУЖИЯ
// 'standard', 'explosive', 'missiles', 'scatter', 'shield', 'slowmo', 'health', 'laser', 'emp', 'speed', 'crit'
let currentAmmoType = 'standard';
let ammoTimer = 0;
let timeDilation = 1.0; 

let currentBoss = null;
let isBossWave = false;
let waveKills = 0;
const KILLS_TO_BOSS = 10;

let screenShakeTimer = 0;
let screenShakeIntensity = 0;

/* --- ДИНАМИЧЕСКИЕ ФОНЫ СЕКТОРОВ --- */
const backgroundThemes = [
    { name: "Сектор I", top: '#020617', bottom: '#0f172a' },
    { name: "Сектор II", top: '#030712', bottom: '#1e1b4b' },
    { name: "Сектор III", top: '#022c22', bottom: '#064e3b' },
    { name: "Сектор IV", top: '#451a03', bottom: '#78350f' },
    { name: "Сектор V", top: '#3b0764', bottom: '#581c87' }
];

/* --- ЗВУКОВОЙ ДВИЖОК (WEB AUDIO API) --- */
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        let now = audioCtx.currentTime;

        if (type === 'laser') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'explosion') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.linearRampToValueAtTime(20, now + 0.35);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'transform') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(1300, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'heal') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'emp') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.6);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
        } else if (type === 'buff') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(350, now);
            osc.frequency.exponentialRampToValueAtTime(950, now + 0.2);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    } catch (e) {}
}

/* --- ЗВЕЗДНЫЙ ФОН --- */
for (let i = 0; i < 110; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.2 + 0.5,
        speed: Math.random() * 1.0 + 0.3
    });
}

window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('touchstart', (e) => {
    player.isDragging = true;
    handleTouch(e);
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
    if (player.isDragging) handleTouch(e);
}, { passive: true });

canvas.addEventListener('touchend', () => { player.isDragging = false; });

function handleTouch(e) {
    let rect = canvas.getBoundingClientRect();
    let touch = e.touches[0];
    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;
    player.x = (touch.clientX - rect.left) * scaleX;
    player.y = (touch.clientY - rect.top) * scaleY;
}

function selectSkin(skinName, element) {
    document.querySelectorAll('.skin-card').forEach(card => card.classList.remove('active'));
    element.classList.add('active');
    selectedSkin = skinName;
}

const skinThemes = {
    cyan: { primary: '#06b6d4', glow: '#06b6d4', engine: '#38bdf8', bullet: '#06b6d4' },
    red: { primary: '#ef4444', glow: '#ef4444', engine: '#f87171', bullet: '#ef4444' },
    gold: { primary: '#f59e0b', glow: '#f59e0b', engine: '#fbbf24', bullet: '#f59e0b' }
};

/* --- СТАРТ ИГРЫ --- */
function startGame(difficulty) {
    initAudio();
    currentDifficulty = difficulty;
    menuScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    playScreen.style.display = 'flex';
    bossHudContainer.style.display = 'none';

    if (difficulty === 'easy') player.maxHp = 240;
    else if (difficulty === 'medium') player.maxHp = 180;
    else if (difficulty === 'hard') player.maxHp = 130;

    player.hp = player.maxHp;
    player.tier = 1;
    player.evolutionPoints = 0;
    player.evolutionMax = 80;
    currentAmmoType = 'standard';
    ammoTimer = 0;
    timeDilation = 1.0;
    player.speed = 4.2;

    updateHealthBar();
    updateEvolutionBar();

    score = 0;
    wave = 1;
    waveKills = 0;
    sectorHealthDrops = 0;
    isBossWave = false;
    currentBoss = null;

    scoreEl.textContent = score;
    waveEl.textContent = wave;
    tierLabel.textContent = "ФАЗА I";
    ammoLabel.textContent = "СТАНДАРТ";

    player.x = canvas.width / 2;
    player.y = canvas.height - 80;

    bullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    shockwaves = [];
    evolutionCores = [];
    ammoPickups = [];
    floatingTexts = [];
    gameActive = true;

    startWave();
    requestAnimationFrame(gameLoop);
}

function returnToMenu() {
    gameActive = false;
    playScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    menuScreen.style.display = 'flex';
}

function updateHealthBar() {
    let percent = Math.max(0, (player.hp / player.maxHp) * 100);
    healthBarFill.style.width = percent + '%';
}

function updateEvolutionBar() {
    let percent = Math.min(100, (player.evolutionPoints / player.evolutionMax) * 100);
    evolutionBarFill.style.width = percent + '%';
}

function triggerScreenShake(intensity, duration) {
    screenShakeIntensity = intensity;
    screenShakeTimer = duration;
}

function addFloatingText(text, x, y, color) {
    floatingTexts.push({ text: text, x: x, y: y, color: color || '#ffffff', life: 1.0, dy: -0.8 });
}

/* --- ВОЛНЫ ВРАГОВ (ТЯЖЕЛЫЕ И МАНЕВРИРУЮЩИЕ МОБЫ) --- */
let enemySpawnInterval;

function startWave() {
    if (!gameActive) return;
    clearInterval(enemySpawnInterval);

    isBossWave = false;
    waveKills = 0;
    sectorHealthDrops = 0;
    bossHudContainer.style.display = 'none';
    currentBoss = null;

    let baseSpawnRate = currentDifficulty === 'easy' ? 2600 : currentDifficulty === 'medium' ? 2100 : 1600;
    let spawnRate = Math.max(900, baseSpawnRate - (wave - 1) * 120);

    enemySpawnInterval = setInterval(() => {
        if (!gameActive || isBossWave) return;
        spawnEnemy();
    }, spawnRate);
}

const enemyTypesList = ['drone', 'fighter', 'heavy', 'interceptor'];

function spawnEnemy() {
    let type = enemyTypesList[Math.floor(Math.random() * enemyTypesList.length)];

    let eWidth = type === 'heavy' ? 52 : (type === 'fighter' ? 40 : (type === 'interceptor' ? 34 : 30));
    let eHeight = type === 'heavy' ? 52 : (type === 'fighter' ? 40 : (type === 'interceptor' ? 34 : 30));
    
    // СУЩЕСТВЕННО ПОВЫШЕННОЕ ЗДОРОВЬЕ МОБОВ
    let hpMultiplier = 1.6 + (wave - 1) * 0.35;
    let baseHp = type === 'heavy' ? 140 : (type === 'fighter' ? 75 : (type === 'interceptor' ? 50 : 30));
    let eHp = Math.round(baseHp * hpMultiplier);
    
    let eSpeed = (type === 'drone' ? 0.85 : (type === 'heavy' ? 0.38 : (type === 'interceptor' ? 1.15 : 0.6))) * (1 + (wave - 1) * 0.025);

    enemies.push({
        x: Math.random() * (canvas.width - 120) + 60,
        y: -60,
        width: eWidth,
        height: eHeight,
        speed: eSpeed,
        hp: eHp,
        maxHp: eHp,
        type: type,
        shootTimer: 0,
        wobbleOffset: Math.random() * 100,
        dodgeTimer: 0,
        dodgeDir: Math.random() > 0.5 ? 1 : -1
    });
}

const bossPrefixes = ["Альфа", "Омега", "Квант", "Нейтро", "Гипер", "Титан", "Фантом", "Зеркало", "Вектор", "Апекс"];
const bossSuffixes = ["Дредноут", "Разрушитель", "Перехватчик", "Крейсер", "Интегратор", "Монарх", "Анигилятор", "Страж"];
const bossShapes = ["triangle", "circle", "hexagon", "diamond", "star", "octagram"];
const bossMechanics = ["cerberus_spread", "storm_pulse", "cyclone_missiles", "apocalypse_comb", "plasma_spiral", "laser_sweep"];
const bossColors = ["#dc2626", "#9333ea", "#f59e0b", "#06b6d4", "#10b981", "#ec4899", "#6366f1"];

function generateProceduralBoss(sectorNum) {
    let prefix = bossPrefixes[(sectorNum * 3) % bossPrefixes.length];
    let suffix = bossSuffixes[(sectorNum * 7) % bossSuffixes.length];
    let shape = bossShapes[sectorNum % bossShapes.length];
    let mechanic = bossMechanics[sectorNum % bossMechanics.length];
    let color = bossColors[sectorNum % bossColors.length];
    
    let hp = 1400 + sectorNum * 450; 
    let name = `${prefix} ${suffix} #${sectorNum}`;

    return {
        name: name,
        hp: hp,
        maxHp: hp,
        color: color,
        shape: shape,
        mechanic: mechanic,
        x: canvas.width / 2,
        y: -150,
        targetY: 90,
        width: 110,
        height: 84,
        dir: 1,
        speed: 0.6 + (sectorNum * 0.02),
        shootTimer: 0
    };
}

function spawnBoss() {
    isBossWave = true;
    clearInterval(enemySpawnInterval);
    enemies = [];

    currentBoss = generateProceduralBoss(wave);

    bossNameEl.textContent = `⚠️ ${currentBoss.name} (СЕКТОР ${wave})`;
    bossHudContainer.style.display = 'block';
    updateBossHpBar();
}

function updateBossHpBar() {
    if (!currentBoss) return;
    let pct = Math.max(0, (currentBoss.hp / currentBoss.maxHp) * 100);
    bossBarFill.style.width = pct + '%';
    bossHpText.textContent = Math.round(pct) + '%';
}

/* --- РАСШИРЕННАЯ СИСТЕМА БАФОВ (10 ВИДОВ) И ХИЛ --- */
function dropItems(x, y) {
    if (Math.random() < 0.50) {
        evolutionCores.push({ x: x, y: y, size: 10, speed: 0.9 });
    }
    
    // Лимит аптечек за сектор (1-2 макс)
    if (sectorHealthDrops < 2 && Math.random() < 0.15) {
        ammoPickups.push({ x: x, y: y, type: 'health', speed: 0.8 });
        sectorHealthDrops++;
        return;
    }

    // 10 РАЗЛИЧНЫХ БАФОВ ВООРУЖЕНИЯ И УСИЛЕНИЙ
    if (Math.random() < 0.38) {
        let buffTypes = ['explosive', 'missiles', 'scatter', 'shield', 'slowmo', 'laser', 'emp', 'speed', 'crit'];
        let chosenBuff = buffTypes[Math.floor(Math.random() * buffTypes.length)];
        ammoPickups.push({ x: x, y: y, type: chosenBuff, speed: 0.8 });
    }
}

function addEvolution(amount) {
    if (player.tier >= 5) return;

    player.evolutionPoints += amount;
    updateEvolutionBar();

    if (player.evolutionPoints >= player.evolutionMax) {
        player.tier++;
        player.evolutionPoints = 0;
        player.evolutionMax = Math.round(player.evolutionMax * 1.4);
        updateEvolutionBar();

        playSound('transform');
        triggerScreenShake(7, 25);
        createExplosion(player.x, player.y, skinThemes[selectedSkin].primary, 40);

        let phaseNames = ["", "ФАЗА I", "ФАЗА II", "ФАЗА III", "ФАЗА IV", "ФАЗА V (Apex)"];
        tierLabel.textContent = phaseNames[player.tier];
        addFloatingText(`⚡ АВАНС ДО ${phaseNames[player.tier]}!`, player.x, player.y - 30, '#06b6d4');
        player.hp = Math.min(player.maxHp, player.hp + 50);
        updateHealthBar();
    }
}

/* --- ИГРОВОЙ ЦИКЛ (UPDATE) --- */
let shootTimer = 0;

function update() {
    if (!gameActive) return;

    if (screenShakeTimer > 0) screenShakeTimer--;

    if (ammoTimer > 0) {
        ammoTimer--;
        if (ammoTimer <= 0) {
            currentAmmoType = 'standard';
            timeDilation = 1.0;
            player.speed = 4.2;
            ammoLabel.textContent = "СТАНДАРТ";
            powerupStatus.textContent = '';
        }
    }

    stars.forEach(s => {
        s.y += s.speed * timeDilation;
        if (s.y > canvas.height) s.y = 0;
    });

    if (!player.isDragging) {
        let curSpeed = player.speed;
        if ((keys['w'] || keys['arrowup']) && player.y > 45) player.y -= curSpeed;
        if ((keys['s'] || keys['arrowdown']) && player.y < canvas.height - 45) player.y += curSpeed;
        if ((keys['a'] || keys['arrowleft']) && player.x > 40) player.x -= curSpeed;
        if ((keys['d'] || keys['arrowright']) && player.x < canvas.width - 40) player.x += curSpeed;
    }

    let fireInterval = player.tier === 5 ? 10 : (player.tier >= 3 ? 14 : 20);
    shootTimer++;
    if (shootTimer >= fireInterval) {
        shootTimer = 0;
        let theme = skinThemes[selectedSkin];
        playSound('laser');

        if (currentAmmoType === 'explosive') {
            bullets.push({ x: player.x, y: player.y - 24, width: 8, height: 18, speed: 6.5, type: 'explosive', color: '#f59e0b' });
        } else if (currentAmmoType === 'missiles') {
            bullets.push({ x: player.x - 12, y: player.y - 20, width: 5, height: 16, speed: 5.5, type: 'missile', color: '#ef4444' });
            bullets.push({ x: player.x + 12, y: player.y - 20, width: 5, height: 16, speed: 5.5, type: 'missile', color: '#ef4444' });
        } else if (currentAmmoType === 'laser') {
            bullets.push({ x: player.x, y: player.y - 28, width: 6, height: 26, speed: 9.0, type: 'laser', color: '#38bdf8' });
        } else if (currentAmmoType === 'scatter' || player.tier >= 4) {
            bullets.push({ x: player.x, y: player.y - 26, width: 5, height: 16, speed: 7.5, dx: 0, type: 'normal', color: theme.bullet });
            bullets.push({ x: player.x, y: player.y - 26, width: 5, height: 16, speed: 7.5, dx: -1.8, type: 'normal', color: theme.bullet });
            bullets.push({ x: player.x, y: player.y - 26, width: 5, height: 16, speed: 7.5, dx: 1.8, type: 'normal', color: theme.bullet });
        } else if (player.tier >= 2) {
            bullets.push({ x: player.x - 8, y: player.y - 22, width: 5, height: 14, speed: 7, dx: 0, type: 'normal', color: theme.bullet });
            bullets.push({ x: player.x + 8, y: player.y - 22, width: 5, height: 14, speed: 7, dx: 0, type: 'normal', color: theme.bullet });
        } else {
            bullets.push({ x: player.x, y: player.y - 24, width: 5, height: 14, speed: 6.5, dx: 0, type: 'normal', color: theme.bullet });
        }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.y -= b.speed;
        b.x += (b.dx || 0);

        if (b.type === 'missile') {
            let target = currentBoss || (enemies.length > 0 ? enemies[0] : null);
            if (target) {
                if (b.x < target.x) b.x += 1.1;
                if (b.x > target.x) b.x -= 1.1;
            }
        }

        if (b.y < 0 || b.x < 0 || b.x > canvas.width) bullets.splice(i, 1);
    }

    // Логика процедурных боссов
    if (currentBoss) {
        if (currentBoss.y < currentBoss.targetY) {
            currentBoss.y += currentBoss.speed;
        } else {
            currentBoss.x += currentBoss.speed * currentBoss.dir;
            if (currentBoss.x < 110 || currentBoss.x > canvas.width - 110) currentBoss.dir *= -1;
        }

        currentBoss.shootTimer++;
        let attackDelay = Math.max(28, 48 - wave * 2);
        if (currentBoss.shootTimer > attackDelay) {
            currentBoss.shootTimer = 0;

            if (currentBoss.mechanic === 'cerberus_spread') {
                for (let a = -3; a <= 3; a++) {
                    enemyBullets.push({ x: currentBoss.x, y: currentBoss.y + 38, width: 6, height: 12, speedX: a * 0.6, speedY: 1.8 * timeDilation });
                }
            } else if (currentBoss.mechanic === 'storm_pulse') {
                let offset = Math.sin(Date.now() / 300) * 50;
                enemyBullets.push({ x: currentBoss.x + offset, y: currentBoss.y + 32, width: 6, height: 12, speedX: 0, speedY: 2.0 * timeDilation });
                enemyBullets.push({ x: currentBoss.x - offset, y: currentBoss.y + 32, width: 6, height: 12, speedX: 0, speedY: 2.0 * timeDilation });
            } else if (currentBoss.mechanic === 'cyclone_missiles') {
                let angleToPlayer = Math.atan2(player.y - currentBoss.y, player.x - currentBoss.x);
                enemyBullets.push({ x: currentBoss.x, y: currentBoss.y + 38, width: 7, height: 14, speedX: Math.cos(angleToPlayer) * 1.6, speedY: Math.sin(angleToPlayer) * 1.6 * timeDilation });
            } else if (currentBoss.mechanic === 'plasma_spiral') {
                let sAngle = Date.now() / 200;
                for (let i = 0; i < 3; i++) {
                    let ang = sAngle + (i * Math.PI * 2) / 3;
                    enemyBullets.push({ x: currentBoss.x, y: currentBoss.y, width: 5, height: 10, speedX: Math.cos(ang) * 1.5, speedY: Math.sin(ang) * 1.5 * timeDilation });
                }
            } else {
                for (let a = -3; a <= 3; a += 2) {
                    enemyBullets.push({ x: currentBoss.x, y: currentBoss.y + 38, width: 6, height: 12, speedX: a * 0.7, speedY: 1.9 * timeDilation });
                }
            }
        }

        let distBoss = Math.hypot(player.x - currentBoss.x, player.y - currentBoss.y);
        if (distBoss < 55 && currentAmmoType !== 'shield') {
            player.hp -= 1;
            updateHealthBar();
            playSound('hit');
            if (player.hp <= 0) gameOver();
        }
    } else if (!isBossWave) {
        // УСИЛЕННЫЕ И МАНЕВРИРУЮЩИЕ МОБЫ (АКТИВНЫЙ МАНС И УКЛОНЕНИЕ)
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            e.y += e.speed * timeDilation;

            // Активный маневровый уворот (мобы "мансят" влево-вправо)
            e.dodgeTimer++;
            if (e.dodgeTimer > 55) {
                e.dodgeTimer = 0;
                e.dodgeDir = Math.random() > 0.5 ? 1 : -1;
            }
            e.x += e.dodgeDir * 1.4;
            if (e.x < 50) e.x = 50;
            if (e.x > canvas.width - 50) e.x = canvas.width - 50;

            if (e.type === 'fighter') {
                e.x += Math.sin(e.y / 30 + e.wobbleOffset) * 2.2;
                e.shootTimer++;
                if (e.shootTimer > 100) {
                    e.shootTimer = 0;
                    enemyBullets.push({ x: e.x, y: e.y, width: 5, height: 12, speedX: 0, speedY: 2.2 * timeDilation });
                }
            } else if (e.type === 'heavy') {
                e.shootTimer++;
                if (e.shootTimer > 120) {
                    e.shootTimer = 0;
                    enemyBullets.push({ x: e.x - 10, y: e.y, width: 6, height: 12, speedX: -0.6, speedY: 1.8 * timeDilation });
                    enemyBullets.push({ x: e.x + 10, y: e.y, width: 6, height: 12, speedX: 0.6, speedY: 1.8 * timeDilation });
                }
            } else if (e.type === 'interceptor') {
                e.shootTimer++;
                if (e.shootTimer > 80) {
                    e.shootTimer = 0;
                    let angle = Math.atan2(player.y - e.y, player.x - e.x);
                    enemyBullets.push({ x: e.x, y: e.y, width: 4, height: 10, speedX: Math.cos(angle) * 2.0, speedY: Math.sin(angle) * 2.0 * timeDilation });
                }
            } else {
                e.shootTimer++;
                if (e.shootTimer > 130) {
                    e.shootTimer = 0;
                    enemyBullets.push({ x: e.x, y: e.y, width: 4, height: 10, speedX: 0, speedY: 1.7 * timeDilation });
                }
            }

            let dist = Math.hypot(player.x - e.x, player.y - e.y);
            if (dist < 34) {
                if (currentAmmoType !== 'shield') {
                    player.hp -= 12;
                    updateHealthBar();
                    playSound('hit');
                    triggerScreenShake(3, 12);
                    if (player.hp <= 0) gameOver();
                }
                enemies.splice(i, 1);
                createExplosion(e.x, e.y, '#ef4444', 12);
                continue;
            }

            if (e.y > canvas.height + 60) enemies.splice(i, 1);
        }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
        eb.y += (eb.speedY || 1.8);
        eb.x += (eb.speedX || 0);

        let hitPlayer = Math.abs(eb.x - player.x) < 18 && Math.abs(eb.y - player.y) < 18;
        if (hitPlayer) {
            if (currentAmmoType !== 'shield') {
                player.hp -= currentDifficulty === 'hard' ? 8 : 5;
                updateHealthBar();
                playSound('hit');
                triggerScreenShake(3, 10);
                if (player.hp <= 0) gameOver();
            }
            enemyBullets.splice(i, 1);
            continue;
        }
        if (eb.y > canvas.height || eb.x < 0 || eb.x > canvas.width) enemyBullets.splice(i, 1);
    }

    // Попадания пуль игрока по врагам с учетом критов
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        let bulletRemoved = false;

        if (currentBoss) {
            let hitBoss = Math.abs(b.x - currentBoss.x) < currentBoss.width / 2 && Math.abs(b.y - currentBoss.y) < currentBoss.height / 2;
            if (hitBoss) {
                let isCrit = Math.random() < player.critChance;
                let dmg = b.type === 'explosive' ? 55 : (b.type === 'laser' ? 45 : 28);
                if (isCrit) dmg *= 2;

                currentBoss.hp -= dmg;
                bulletRemoved = true;
                updateBossHpBar();
                
                if (b.type === 'explosive') {
                    createRealisticExplosion(b.x, b.y);
                } else {
                    createExplosion(b.x, b.y, isCrit ? '#f59e0b' : '#38bdf8', isCrit ? 12 : 5);
                }

                if (currentBoss.hp <= 0) {
                    createRealisticExplosion(currentBoss.x, currentBoss.y);
                    createExplosion(currentBoss.x, currentBoss.y, '#ef4444', 60);
                    playSound('explosion');
                    triggerScreenShake(12, 40);
                    score += 4000;
                    scoreEl.textContent = score;
                    currentBoss = null;
                    bossHudContainer.style.display = 'none';
                    wave++;
                    waveEl.textContent = wave;
                    startWave();
                }
            }
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            let hit = Math.abs(b.x - e.x) < e.width / 2 && Math.abs(b.y - e.y) < e.height / 2;

            if (hit) {
                let isCrit = Math.random() < player.critChance;
                let dmg = b.type === 'explosive' ? 65 : (b.type === 'laser' ? 50 : 25);
                if (isCrit) dmg *= 2;

                e.hp -= dmg;
                bulletRemoved = true;

                if (b.type === 'explosive') {
                    createRealisticExplosion(e.x, e.y);
                    enemies.forEach(other => {
                        if (Math.hypot(other.x - e.x, other.y - e.y) < 80) other.hp -= 40;
                    });
                    if (currentBoss && Math.hypot(currentBoss.x - e.x, currentBoss.y - e.y) < 90) {
                        currentBoss.hp -= 40;
                        updateBossHpBar();
                    }
                }

                if (e.hp <= 0) {
                    enemies.splice(j, 1);
                    createExplosion(e.x, e.y, skinThemes[selectedSkin].primary, 14);
                    playSound('explosion');
                    dropItems(e.x, e.y);

                    score += e.type === 'heavy' ? 300 : 120;
                    scoreEl.textContent = score;
                    waveKills++;

                    if (waveKills >= KILLS_TO_BOSS && !isBossWave) {
                        spawnBoss();
                    }
                }
                break;
            }
        }

        if (bulletRemoved) bullets.splice(i, 1);
    }

    // Сбор ядер эволюции
    for (let i = evolutionCores.length - 1; i >= 0; i--) {
        let core = evolutionCores[i];
        core.y += core.speed;
        let dist = Math.hypot(player.x - core.x, player.y - core.y);
        if (dist < 38) {
            playSound('buff');
            addEvolution(25);
            addFloatingText("+ЭВОЛЮЦИЯ", core.x, core.y, '#9333ea');
            evolutionCores.splice(i, 1);
            continue;
        }
        if (core.y > canvas.height + 20) evolutionCores.splice(i, 1);
    }

    // Сбор бафов и аптечек (10 видов усилений)
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        let ap = ammoPickups[i];
        ap.y += ap.speed;
        let dist = Math.hypot(player.x - ap.x, player.y - ap.y);
        if (dist < 38) {
            if (ap.type === 'health') {
                playSound('heal');
                let healAmount = currentDifficulty === 'easy' ? 60 : 45;
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
                updateHealthBar();
                addFloatingText(`+${healAmount} ХИЛ ❤️`, ap.x, ap.y, '#10b981');
                powerupStatus.textContent = `❤️ ПОДОБРАНА АПТЕЧКА (+${healAmount} БРОНИ)!`;
            } else if (ap.type === 'emp') {
                playSound('emp');
                triggerScreenShake(10, 30);
                enemies = [];
                enemyBullets = [];
                if (currentBoss) currentBoss.hp -= 250;
                updateBossHpBar();
                addFloatingText(`⚡ EMP БОМБА!`, player.x, player.y, '#06b6d4');
                powerupStatus.textContent = `⚡ EMP БОМБА УНИЧТОЖИЛА ВРАГОВ НА ЭКРАНЕ!`;
            } else {
                playSound('buff');
                currentAmmoType = ap.type;
                ammoTimer = 450;
                
                if (ap.type === 'slowmo') {
                    timeDilation = 0.5; 
                } else if (ap.type === 'speed') {
                    player.speed = 6.8;
                    timeDilation = 1.0;
                } else {
                    timeDilation = 1.0;
                }

                let names = { 
                    explosive: 'ВЗРЫВНЫЕ ПУЛИ (УДАРНАЯ ВОЛНА)', 
                    missiles: 'РАКЕТНЫЙ ЗАЛП', 
                    scatter: 'ПЛАЗМЕННЫЙ ВЕЕР', 
                    shield: 'ЭНЕРГОЩИТ', 
                    slowmo: 'КВАНТОВОЕ ЗАМЕДЛЕНИЕ',
                    laser: 'МОЩНЫЙ ПРОНЗАЮЩИЙ ЛАЗЕР',
                    speed: 'ГИПЕРСКОРОСТЬ КОРАБЛЯ',
                    crit: 'КРИТИЧЕСКИЙ УРОН x2'
                };
                ammoLabel.textContent = names[ap.type] || 'БАФ';
                powerupStatus.textContent = `✨ АКТИВИРОВАН БАФ: ${ammoLabel.textContent}!`;
            }

            ammoPickups.splice(i, 1);
            continue;
        }
        if (ap.y > canvas.height + 20) ammoPickups.splice(i, 1);
    }

    for (let i = shockwaves.length - 1; i >= 0; i--) {
        let sw = shockwaves[i];
        sw.radius += sw.expansionRate;
        sw.alpha -= 0.03;
        if (sw.alpha <= 0) shockwaves.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let pt = particles[i];
        pt.x += pt.dx;
        pt.y += pt.dy;
        pt.life -= 0.02;
        if (pt.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.dy;
        ft.life -= 0.025;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
}

function createRealisticExplosion(x, y) {
    playSound('explosion');
    triggerScreenShake(8, 25);
    
    shockwaves.push({
        x: x,
        y: y,
        radius: 10,
        maxRadius: 75,
        expansionRate: 4.5,
        alpha: 1.0,
        color: '#f59e0b'
    });

    for (let i = 0; i < 28; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 6 + 1;
        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            color: Math.random() > 0.3 ? '#ef4444' : '#f59e0b',
            life: 1.0
        });
    }
}

function createExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 5,
            dy: (Math.random() - 0.5) * 5,
            color: Math.random() > 0.4 ? color : '#f59e0b',
            life: 1.0
        });
    }
}

/* --- ОТРИСОВКА (RENDER) --- */
function render() {
    ctx.save();
    
    if (screenShakeTimer > 0) {
        let offsetX = (Math.random() - 0.5) * screenShakeIntensity;
        let offsetY = (Math.random() - 0.5) * screenShakeIntensity;
        ctx.translate(offsetX, offsetY);
    }

    let themeIndex = (wave - 1) % backgroundThemes.length;
    let currentTheme = backgroundThemes[themeIndex];

    let bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, currentTheme.top);
    bgGrad.addColorStop(1, currentTheme.bottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    stars.forEach(s => {
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1.0;

    shockwaves.forEach(sw => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = sw.alpha;
        ctx.shadowBlur = 15;
        ctx.shadowColor = sw.color;
        ctx.stroke();
        ctx.restore();
    });

    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = b.color;
        ctx.fillRect(b.x - b.width / 2, b.y, b.width, b.height);
    });

    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    enemyBullets.forEach(eb => ctx.fillRect(eb.x - eb.width / 2, eb.y, eb.width, eb.height));
    ctx.shadowBlur = 0;

    evolutionCores.forEach(core => {
        ctx.save();
        ctx.translate(core.x, core.y);
        ctx.fillStyle = '#a855f7';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.arc(0, 0, core.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', 0, 0);
        ctx.restore();
    });

    // Отрисовка бафов с иконками для 10 видов
    ammoPickups.forEach(ap => {
        ctx.save();
        ctx.translate(ap.x, ap.y);
        ctx.fillStyle = ap.type === 'health' ? '#10b981' : (ap.type === 'emp' ? '#06b6d4' : '#38bdf8');
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let icons = { 
            explosive: '💥', 
            missiles: '🚀', 
            scatter: '🌀', 
            shield: '🛡️', 
            slowmo: '⏱️', 
            health: '❤️', 
            laser: '⚡', 
            emp: '💣', 
            speed: '🚀', 
            crit: '🎯' 
        };
        ctx.fillText(icons[ap.type] || '🎁', 0, 0);
        ctx.restore();
    });
    ctx.shadowBlur = 0;

    if (currentBoss) {
        ctx.save();
        ctx.translate(currentBoss.x, currentBoss.y);
        ctx.fillStyle = currentBoss.color;
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 24;
        ctx.shadowColor = currentBoss.color;
        ctx.beginPath();

        if (currentBoss.shape === 'triangle') {
            ctx.moveTo(0, currentBoss.height / 2);
            ctx.lineTo(-currentBoss.width / 2, -currentBoss.height / 2);
            ctx.lineTo(currentBoss.width / 2, -currentBoss.height / 2);
        } else if (currentBoss.shape === 'circle') {
            ctx.arc(0, 0, currentBoss.width / 2, 0, Math.PI * 2);
        } else if (currentBoss.shape === 'hexagon') {
            for (let i = 0; i < 6; i++) {
                let angle = (i * Math.PI) / 3;
                let hx = (currentBoss.width / 2) * Math.cos(angle);
                let hy = (currentBoss.height / 2) * Math.sin(angle);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
        } else if (currentBoss.shape === 'diamond') {
            ctx.moveTo(0, currentBoss.height / 2);
            ctx.lineTo(-currentBoss.width / 2, 0);
            ctx.lineTo(0, -currentBoss.height / 2);
            ctx.lineTo(currentBoss.width / 2, 0);
        } else {
            for (let i = 0; i < 8; i++) {
                let angle = (i * Math.PI) / 4;
                let r = i % 2 === 0 ? currentBoss.width / 2 : currentBoss.width / 4;
                let sx = r * Math.cos(angle);
                let sy = r * Math.sin(angle);
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0;
    }

    // Отрисовка маневрирующих мобов с отображением их здоровья (полоски HP над сильными мобами)
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();

        if (e.type === 'heavy') {
            ctx.fillStyle = '#b91c1c';
            ctx.rect(-e.width/2, -e.height/2, e.width, e.height);
        } else if (e.type === 'fighter') {
            ctx.fillStyle = '#ef4444';
            ctx.moveTo(0, e.height / 2);
            ctx.lineTo(-e.width / 2, 0);
            ctx.lineTo(0, -e.height / 2);
            ctx.lineTo(e.width / 2, 0);
        } else if (e.type === 'interceptor') {
            ctx.fillStyle = '#f43f5e';
            ctx.moveTo(0, -e.height / 2);
            ctx.lineTo(-e.width / 2, e.height / 2);
            ctx.lineTo(e.width / 2, e.height / 2);
        } else {
            ctx.fillStyle = '#f87171';
            ctx.rect(-e.width/2 + 4, -e.height/2 + 4, e.width - 8, e.height - 8);
        }

        ctx.closePath();
        ctx.fill();

        // Полоска здоровья моба
        let hpPct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-e.width/2, -e.height/2 - 8, e.width, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-e.width/2, -e.height/2 - 8, e.width * hpPct, 4);

        ctx.restore();
    });
    ctx.shadowBlur = 0;

    let theme = skinThemes[selectedSkin];
    ctx.save();
    ctx.translate(player.x, player.y);
    
    if (currentAmmoType === 'shield') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = theme.engine;
    ctx.shadowBlur = 15;
    ctx.shadowColor = theme.engine;
    ctx.fillRect(-4, 24, 8, 12 + Math.random() * 6);

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = player.tier === 5 ? '#f59e0b' : (player.tier >= 3 ? '#9333ea' : theme.primary);
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    if (player.tier === 5) {
        ctx.moveTo(0, -38);
        ctx.lineTo(-34, 22);
        ctx.lineTo(-14, 14);
        ctx.lineTo(-8, 28);
        ctx.lineTo(8, 28);
        ctx.lineTo(14, 14);
        ctx.lineTo(34, 22);
    } else if (player.tier === 4) {
        ctx.moveTo(0, -34);
        ctx.lineTo(-30, 20);
        ctx.lineTo(-12, 12);
        ctx.lineTo(-6, 26);
        ctx.lineTo(6, 26);
        ctx.lineTo(12, 12);
        ctx.lineTo(30, 20);
    } else if (player.tier === 3) {
        ctx.moveTo(0, -30);
        ctx.lineTo(-26, 18);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-5, 24);
        ctx.lineTo(5, 24);
        ctx.lineTo(10, 10);
        ctx.lineTo(26, 18);
    } else if (player.tier === 2) {
        ctx.moveTo(0, -28);
        ctx.lineTo(-22, 16);
        ctx.lineTo(-8, 8);
        ctx.lineTo(-4, 22);
        ctx.lineTo(4, 22);
        ctx.lineTo(8, 8);
        ctx.lineTo(22, 16);
    } else {
        ctx.moveTo(0, -25);
        ctx.lineTo(-18, 14);
        ctx.lineTo(-7, 8);
        ctx.lineTo(-4, 18);
        ctx.lineTo(4, 18);
        ctx.lineTo(7, 8);
        ctx.lineTo(18, 14);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = player.tier === 5 ? '#f59e0b' : theme.engine;
    ctx.shadowBlur = 12;
    ctx.shadowColor = theme.primary;
    ctx.beginPath();
    ctx.ellipse(0, -6, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;

    floatingTexts.forEach(ft => {
        ctx.save();
        ctx.font = 'bold 12px Orbitron';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.life;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    });

    particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life;
        ctx.fillRect(pt.x, pt.y, 4, 4);
        ctx.globalAlpha = 1.0;
    });

    ctx.restore();
}

function gameLoop() {
    if (!gameActive) return;
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameActive = false;
    playSound('explosion');
    finalScoreEl.textContent = score;
    finalWaveEl.textContent = wave;
    playScreen.style.display = 'none';
    gameOverScreen.style.display = 'flex';
}