const overlay = document.getElementById('hype-train-overlay');
const bar = document.getElementById('hype-train-bar');
const fill = document.getElementById('hype-train-fill');
const confettiLayer = document.getElementById('confetti-layer');
const hypePercent = document.getElementById('hype-percent');
const hypeTitle = document.getElementById('hype-train-title');
const hypeTimer = document.getElementById('hype-timer');
const hypeLevelShell = document.getElementById('hype-level-shell');
const hypeLevel = document.getElementById('hype-level');

let hypeTrainInterval = null;
let hypeTrainEndsAt = null;
let lastExpiresAt = null;
let connectionState = false;
let hypetrainType = "HYPE TRAIN";
let lastLevel = null;
let trainAccentColor = "#FFFFFF";

const client = new StreamerbotClient({
    port: 8080,
    immediate: true,
    autoReconnect: true,
    onConnect: (data) => {
        console.log("connected", data);
        connectionState = true;
        overlay.classList.add('visible');
    },
    onDisconnect: (data) => {
        console.log("disconnected", data);
        connectionState = false;
    },
    onError: (err) => {
        console.error(err);
        connectionState = false;
    }
});

function spawnConfetti(x, y, amount = 24, color = "#ffffff") {
    console.log("confetti burst", { x, y, amount, color });

    for (let i = 0; i < amount; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = x + 'px';
        c.style.top = y + 'px';
        c.style.background = color;

        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 140;

        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance * 0.6;

        c.style.setProperty('--dx', dx + 'px');
        c.style.setProperty('--dy', dy + 'px');
        c.style.setProperty('--rot', (Math.random() * 360 - 180) + 'deg');

        confettiLayer.appendChild(c);
        setTimeout(() => c.remove(), 1300);
    }
}

function burstFromBar(amount = 30, color = "#ffffff") {
    const rect = bar.getBoundingClientRect();
    spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, amount, color);
}

function burstFromLevel(amount = 16, color = "#ffffff") {
    const rect = hypeLevelShell.getBoundingClientRect();
    spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, amount, color);
}

function currentTrainColor() {
    return trainAccentColor;
}

function restartBurst(el) {
    el.classList.remove('burst');
    void el.offsetWidth;
    el.classList.add('burst');
    el.addEventListener('animationend', () => el.classList.remove('burst'), { once: true });
}

function setTrainStyleFromPayload(payload) {
    if (payload.data.is_golden_kappa_train === true) {
        fill.style.background = "linear-gradient(90deg, rgba(242, 217, 22, 1) 0%, rgba(194, 139, 50, 1) 31%, rgba(242, 175, 6, 1) 72%, rgba(255, 251, 0, 1) 100%)";
        hypetrainType = "GOLDEN KAPPA TRAIN";
        trainAccentColor = "#FFCC00";
    } else if (payload.data.is_treasure_train) {
        fill.style.background = "linear-gradient(92deg, rgba(168, 81, 0, 1) 0%, rgba(143, 255, 219, 1) 65%, rgba(0, 195, 255, 1) 100%)";
        hypetrainType = "TREASURE TRAIN";
        trainAccentColor = "#FFCC00";
    } else {
        fill.style.background = "linear-gradient(90deg, rgba(0, 0, 0, 1) 0%, rgba(9, 67, 121, 1) 31%, rgba(242, 6, 136, 1) 80%, rgba(255, 42, 0, 1) 100%)";
        hypetrainType = "HYPE TRAIN";
        trainAccentColor = "#FFFFFF";
    }
}

client.on('Twitch.StreamOnline', async () => {
    overlay.classList.remove('visible');
});

client.on('Custom.Event', (payload) => {
    console.log("Custom event received", payload);

    if (payload?.data?.eventName !== 'confetti') return;

    const amount = Number(payload?.data?.args?.amount ?? 48);
    const color = payload?.data?.args?.color ?? '#ffffff';
    const rect = bar.getBoundingClientRect();

    spawnConfetti(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        amount,
        color
    );
});

client.on('Twitch.HypeTrainStart', async (payload) => {
    console.log("HypeTrainStart", payload);

    setTrainStyleFromPayload(payload);
    overlay.style.display = 'block';
    overlay.classList.add('visible');

    handleHypeTrain(payload);

    setTimeout(() => {
        burstFromBar(40, currentTrainColor());
        restartBurst(bar);
        restartBurst(hypeLevelShell);
    }, 180);
});

client.on('Twitch.HypeTrainUpdate', async (payload) => {
    console.log("HypeTrainUpdate", payload);
    handleHypeTrain(payload);
});

client.on('Twitch.HypeTrainLevelUp', async (payload) => {
    console.log("HypeTrainLevelUp", payload);

    const newLevel = payload.data?.level;

    handleHypeTrain(payload);

    if (newLevel != null && newLevel !== lastLevel) {
        lastLevel = newLevel;

        setTimeout(() => {
            const color = currentTrainColor();
            burstFromBar(22, color);
            burstFromLevel(16, color);
            restartBurst(bar);
            restartBurst(hypeLevelShell);
        }, 120);
    }
});

client.on('Twitch.HypeTrainEnd', async (payload) => {
    console.log("HypeTrainEnd", payload);

    clearInterval(hypeTrainInterval);
    hypeTrainInterval = null;
    hypeTrainEndsAt = null;
    lastExpiresAt = null;
    lastLevel = null;

    overlay.classList.remove('visible');
});

function startHypeTrainTimer(expiresAtIso) {
    hypeTrainEndsAt = new Date(expiresAtIso).getTime();

    clearInterval(hypeTrainInterval);
    hypeTrainInterval = setInterval(updateHypeTrainTimer, 500);

    updateHypeTrainTimer();
}

function updateHypeTrainTimer() {
    if (!hypeTrainEndsAt) return;

    const remainingMs = hypeTrainEndsAt - Date.now();

    if (remainingMs <= 0) {
        hypeTimer.innerText = '0:00';
        clearInterval(hypeTrainInterval);
        overlay.classList.remove('visible');
        return;
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString();
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    hypeTimer.innerText = `${minutes}:${seconds}`;
}

function syncHypeTrainTimer(expiresAtIso) {
    if (!expiresAtIso) return;

    if (expiresAtIso !== lastExpiresAt) {
        lastExpiresAt = expiresAtIso;
        hypeTrainEndsAt = new Date(expiresAtIso).getTime();

        clearInterval(hypeTrainInterval);
        hypeTrainInterval = setInterval(updateHypeTrainTimer, 500);

        updateHypeTrainTimer();
    }
}

function handleHypeTrain(payload) {
    const { progress, goal, level, expires_at } = payload.data;

    overlay.style.display = 'block';

    const percent = goal ? Math.min(100, (progress / goal) * 100) : 0;
    fill.style.width = `${percent}%`;

    hypePercent.innerText = `${Math.floor(percent)}%`;
    hypeTitle.innerText = hypetrainType;
    hypeLevel.innerText = `LEVEL ${level}`;

    syncHypeTrainTimer(expires_at);

    if (level != null && level !== lastLevel) {
        lastLevel = level;
        restartBurst(hypeLevelShell);
    }
}

window.testConfetti = function () {
    const r = bar.getBoundingClientRect();
    spawnConfetti(r.left + r.width / 2, r.top + r.height / 2, 30, "#ffffff");
};
