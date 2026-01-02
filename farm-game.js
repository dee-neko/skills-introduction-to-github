// ゲーム状態
const gameState = {
    money: 1000,
    level: 1,
    timeLeft: 300,
    gameRunning: false,
    selectedPlot: null,
    crops: [],
    animals: [],
    harvestedCrops: {
        tomato: 0,
        carrot: 0,
        wheat: 0
    }
};

// 作物データ
const cropData = {
    tomato: {
        name: 'トマト',
        icon: '🍅',
        cost: 100,
        growTime: 30,
        sellPrice: 200,
        growthStages: ['🌱', '🌿', '🍅']
    },
    carrot: {
        name: 'ニンジン',
        icon: '🥕',
        cost: 80,
        growTime: 20,
        sellPrice: 150,
        growthStages: ['🌱', '🌿', '🥕']
    },
    wheat: {
        name: '小麦',
        icon: '🌾',
        cost: 60,
        growTime: 15,
        sellPrice: 120,
        growthStages: ['🌱', '🌿', '🌾']
    }
};

// 家畜データ
const animalData = {
    chicken: {
        name: 'ニワトリ',
        icon: '🐔',
        cost: 200,
        feedCost: 20,
        income: 50,
        incomeInterval: 15
    },
    cow: {
        name: 'ウシ',
        icon: '🐄',
        cost: 500,
        feedCost: 30,
        income: 100,
        incomeInterval: 20
    },
    sheep: {
        name: 'ヒツジ',
        icon: '🐑',
        cost: 300,
        feedCost: 25,
        income: 70,
        incomeInterval: 18
    }
};

// ミッション
const mission = {
    tomatoes: 3,
    chickens: 2,
    targetMoney: 2000
};

let timerInterval;
let gameTickInterval;

// 初期化
function init() {
    createFarmGrid();
    updateUI();
    setupEventListeners();
}

// 農場グリッド作成
function createFarmGrid() {
    const farmGrid = document.getElementById('farm-grid');
    farmGrid.innerHTML = '';

    for (let i = 0; i < 9; i++) {
        const plot = document.createElement('div');
        plot.className = 'farm-plot empty';
        plot.dataset.plotId = i;
        plot.addEventListener('click', () => handlePlotClick(i));
        farmGrid.appendChild(plot);

        gameState.crops[i] = null;
    }
}

// プロットクリック処理
function handlePlotClick(plotId) {
    if (!gameState.gameRunning) {
        addLog('ゲームを開始してください', 'error');
        return;
    }

    const crop = gameState.crops[plotId];

    if (crop && crop.ready) {
        harvestCrop(plotId);
    } else if (crop) {
        addLog('作物はまだ育っていません', 'error');
    } else {
        gameState.selectedPlot = plotId;
        addLog(`区画 ${plotId + 1} を選択しました。作物を選んでください`);
    }
}

// 作物を植える
function plantCrop(cropType) {
    if (!gameState.gameRunning) {
        addLog('ゲームを開始してください', 'error');
        return;
    }

    if (gameState.selectedPlot === null) {
        addLog('まず農場の区画をクリックしてください', 'error');
        return;
    }

    const plotId = gameState.selectedPlot;

    if (gameState.crops[plotId]) {
        addLog('この区画にはすでに作物があります', 'error');
        return;
    }

    const crop = cropData[cropType];

    if (gameState.money < crop.cost) {
        addLog(`お金が足りません！${crop.name}は${crop.cost}円必要です`, 'error');
        return;
    }

    gameState.money -= crop.cost;
    gameState.crops[plotId] = {
        type: cropType,
        plantedAt: Date.now(),
        growTime: crop.growTime,
        ready: false
    };

    gameState.selectedPlot = null;
    updateUI();
    addLog(`${crop.name}を植えました！(-${crop.cost}円)`, 'success');
}

// 作物を収穫
function harvestCrop(plotId) {
    const crop = gameState.crops[plotId];
    if (!crop || !crop.ready) return;

    const cropInfo = cropData[crop.type];
    gameState.money += cropInfo.sellPrice;
    gameState.harvestedCrops[crop.type]++;
    gameState.crops[plotId] = null;

    updateUI();
    addLog(`${cropInfo.name}を収穫しました！(+${cropInfo.sellPrice}円)`, 'success');
    checkMission();
}

// 家畜を購入
function buyAnimal(animalType) {
    if (!gameState.gameRunning) {
        addLog('ゲームを開始してください', 'error');
        return;
    }

    const animal = animalData[animalType];

    if (gameState.money < animal.cost) {
        addLog(`お金が足りません！${animal.name}は${animal.cost}円必要です`, 'error');
        return;
    }

    if (gameState.animals.length >= 6) {
        addLog('家畜エリアがいっぱいです', 'error');
        return;
    }

    gameState.money -= animal.cost;
    gameState.animals.push({
        type: animalType,
        hunger: 100,
        lastIncome: Date.now()
    });

    updateUI();
    addLog(`${animal.name}を購入しました！(-${animal.cost}円)`, 'success');
    checkMission();
}

// すべての家畜に餌をやる
function feedAllAnimals() {
    if (!gameState.gameRunning) {
        addLog('ゲームを開始してください', 'error');
        return;
    }

    if (gameState.animals.length === 0) {
        addLog('家畜がいません', 'error');
        return;
    }

    const totalCost = 50;

    if (gameState.money < totalCost) {
        addLog(`お金が足りません！餌代は${totalCost}円必要です`, 'error');
        return;
    }

    gameState.money -= totalCost;
    gameState.animals.forEach(animal => {
        animal.hunger = 100;
    });

    updateUI();
    addLog(`すべての家畜に餌をやりました！(-${totalCost}円)`, 'success');
}

// ゲームティック（1秒ごと）
function gameTick() {
    const now = Date.now();

    // 作物の成長
    gameState.crops.forEach((crop, index) => {
        if (crop && !crop.ready) {
            const elapsed = (now - crop.plantedAt) / 1000;
            if (elapsed >= crop.growTime) {
                crop.ready = true;
            }
        }
    });

    // 家畜の空腹度と収入
    gameState.animals.forEach(animal => {
        const animalInfo = animalData[animal.type];

        // 空腹度を減らす
        animal.hunger = Math.max(0, animal.hunger - 0.5);

        // 満腹なら収入
        if (animal.hunger > 50) {
            const timeSinceIncome = (now - animal.lastIncome) / 1000;
            if (timeSinceIncome >= animalInfo.incomeInterval) {
                gameState.money += animalInfo.income;
                animal.lastIncome = now;
                addLog(`${animalInfo.name}から${animalInfo.income}円の収入！`, 'success');
            }
        }
    });

    updateUI();
}

// ゲーム開始
function startGame() {
    if (gameState.gameRunning) return;

    gameState.gameRunning = true;
    gameState.timeLeft = 300;
    gameState.money = 1000;
    gameState.level = 1;
    gameState.crops = new Array(9).fill(null);
    gameState.animals = [];
    gameState.harvestedCrops = { tomato: 0, carrot: 0, wheat: 0 };

    document.getElementById('start-game').textContent = 'ゲーム進行中...';
    document.getElementById('start-game').disabled = true;

    createFarmGrid();
    updateUI();
    addLog('ゲームスタート！目標を達成しましょう！', 'success');

    // タイマー
    timerInterval = setInterval(() => {
        gameState.timeLeft--;

        if (gameState.timeLeft <= 0) {
            endGame(false);
        }

        updateUI();
    }, 1000);

    // ゲームティック
    gameTickInterval = setInterval(gameTick, 1000);
}

// ゲーム終了
function endGame(won) {
    gameState.gameRunning = false;
    clearInterval(timerInterval);
    clearInterval(gameTickInterval);

    const modal = document.getElementById('game-over-modal');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');

    if (won) {
        resultTitle.textContent = '🎉 ミッション達成！🎉';
        resultMessage.textContent = `おめでとうございます！時間内にすべての目標を達成しました！\n最終所持金: ${gameState.money}円`;
    } else {
        resultTitle.textContent = '⏰ タイムアップ';
        resultMessage.textContent = `残念！時間切れです。\nトマト: ${gameState.harvestedCrops.tomato}/${mission.tomatoes}\nニワトリ: ${countAnimalType('chicken')}/${mission.chickens}\n所持金: ${gameState.money}/${mission.targetMoney}円`;
    }

    modal.classList.add('show');
}

// ミッションチェック
function checkMission() {
    const tomatoGoal = gameState.harvestedCrops.tomato >= mission.tomatoes;
    const chickenGoal = countAnimalType('chicken') >= mission.chickens;
    const moneyGoal = gameState.money >= mission.targetMoney;

    // ミッションリスト更新
    const missionList = document.getElementById('mission-list');
    missionList.innerHTML = `
        <p style="color: ${tomatoGoal ? 'green' : 'black'}">${tomatoGoal ? '✓' : '○'} トマトを3個収穫する (${gameState.harvestedCrops.tomato}/3)</p>
        <p style="color: ${chickenGoal ? 'green' : 'black'}">${chickenGoal ? '✓' : '○'} ニワトリを2羽育てる (${countAnimalType('chicken')}/2)</p>
        <p style="color: ${moneyGoal ? 'green' : 'black'}">${moneyGoal ? '✓' : '○'} 所持金を2000円にする (${gameState.money}/2000円)</p>
    `;

    if (tomatoGoal && chickenGoal && moneyGoal) {
        const missionStatus = document.getElementById('mission-status');
        missionStatus.textContent = '🎉 ミッション達成！';
        missionStatus.className = 'mission-complete';
        endGame(true);
    }
}

// 特定の家畜の数をカウント
function countAnimalType(type) {
    return gameState.animals.filter(animal => animal.type === type).length;
}

// UI更新
function updateUI() {
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('timer').textContent = gameState.timeLeft;

    // 作物の表示
    gameState.crops.forEach((crop, index) => {
        const plot = document.querySelector(`[data-plot-id="${index}"]`);
        if (!plot) return;

        if (crop) {
            const cropInfo = cropData[crop.type];
            const elapsed = (Date.now() - crop.plantedAt) / 1000;
            const progress = Math.min(elapsed / crop.growTime, 1);

            let icon;
            if (crop.ready) {
                icon = cropInfo.icon;
                plot.className = 'farm-plot ready';
            } else if (progress < 0.33) {
                icon = cropInfo.growthStages[0];
                plot.className = 'farm-plot growing';
            } else if (progress < 0.66) {
                icon = cropInfo.growthStages[1];
                plot.className = 'farm-plot growing';
            } else {
                icon = cropInfo.growthStages[2];
                plot.className = 'farm-plot growing';
            }

            plot.innerHTML = `
                ${icon}
                <div class="growth-bar">
                    <div class="growth-progress" style="width: ${progress * 100}%"></div>
                </div>
            `;
        } else {
            plot.className = 'farm-plot empty';
            plot.innerHTML = '🟫';
        }
    });

    // 家畜の表示
    const animalsGrid = document.getElementById('animals-grid');
    animalsGrid.innerHTML = '';

    gameState.animals.forEach(animal => {
        const animalInfo = animalData[animal.type];
        const slot = document.createElement('div');
        slot.className = 'animal-slot';
        if (animal.hunger < 50) {
            slot.classList.add('hungry');
        }

        slot.innerHTML = `
            <div>${animalInfo.icon}</div>
            <div style="font-size: 0.5em; margin-top: 5px;">${animalInfo.name}</div>
            <div class="hunger-bar">
                <div class="hunger-level" style="width: ${animal.hunger}%"></div>
            </div>
        `;

        animalsGrid.appendChild(slot);
    });
}

// ログ追加
function addLog(message, type = 'normal') {
    const logDiv = document.getElementById('game-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logDiv.insertBefore(entry, logDiv.firstChild);

    // ログが多すぎたら削除
    while (logDiv.children.length > 20) {
        logDiv.removeChild(logDiv.lastChild);
    }
}

// イベントリスナー設定
function setupEventListeners() {
    document.getElementById('start-game').addEventListener('click', startGame);

    document.querySelectorAll('.btn-crop').forEach(btn => {
        btn.addEventListener('click', () => {
            const cropType = btn.dataset.crop;
            plantCrop(cropType);
        });
    });

    document.querySelectorAll('.btn-animal').forEach(btn => {
        btn.addEventListener('click', () => {
            const animalType = btn.dataset.animal;
            buyAnimal(animalType);
        });
    });

    document.getElementById('feed-all').addEventListener('click', feedAllAnimals);

    document.getElementById('restart-game').addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.remove('show');
        document.getElementById('start-game').textContent = 'ゲーム開始';
        document.getElementById('start-game').disabled = false;

        const missionStatus = document.getElementById('mission-status');
        missionStatus.textContent = '未達成';
        missionStatus.className = 'mission-incomplete';

        createFarmGrid();
        updateUI();
        checkMission();
    });
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', init);
