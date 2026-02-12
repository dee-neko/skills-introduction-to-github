const ATTACK_CARDS = [
  { id: "ATK-001", name: "外部電源喪失", category: "外部ハザード", tags: ["電源", "拡大"], baseDamage: 700, effects: [{ kind: "disable_system", targetSystemId: "AUTO-002", value: 1 }] },
  { id: "ATK-002", name: "冷却ポンプ停止", category: "内部ハザード", tags: ["冷却", "熱"], baseDamage: 800, effects: [{ kind: "conditional_bonus_damage", condition: "AUTO-002 disabled", value: 200 }] },
  { id: "ATK-006", name: "手順逸脱", category: "内的事象", tags: ["人的"], baseDamage: 600, effects: [{ kind: "conditional_bonus_damage", condition: "no_player_response", value: 200 }] },
  { id: "ATK-011", name: "震度6弱地震", category: "外的事象", tags: ["地震", "複合"], baseDamage: 900, effects: [{ kind: "disable_system", targetSystemId: "AUTO-003", value: 1 }] },
  { id: "ATK-016", name: "複合災害シナリオA", category: "外的事象", tags: ["複合", "地震", "停電"], baseDamage: 1100, effects: [{ kind: "conditional_bonus_damage", condition: "any_auto_system_disabled", value: 200 }] },
  { id: "ATK-020", name: "最終波状攻撃", category: "外部ハザード", tags: ["複合", "最終"], baseDamage: 1300, effects: [{ kind: "playable_only_on_turn", value: 5 }, { kind: "reduce_total_auto_reduction", value: 200 }] },
];

const DEFENSE_CARDS = [
  { id: "DEF-005", name: "中央監視室アラート", dept: "運転", deptClass: "dept-ops", type: "response", tags: ["監視", "制御"], effects: [{ kind: "flat_reduction", value: 250 }] },
  { id: "DEF-009", name: "非常用ディーゼル運用強化", dept: "保全", deptClass: "dept-maint", type: "install", tags: ["拡大防止"], effects: [{ kind: "tag_reduction", targetTagsAny: ["電源"], value: 300 }] },
  { id: "DEF-010", name: "代替注水ライン切替", dept: "保全", deptClass: "dept-maint", type: "emergency", tags: ["拡大防止"], effects: [{ kind: "tag_reduction", targetTagsAny: ["冷却"], value: 350 }] },
  { id: "DEF-014", name: "区域隔離シャッター", dept: "安全", deptClass: "dept-safety", type: "emergency", tags: ["影響緩和"], effects: [{ kind: "flat_reduction", value: 400 }] },
  { id: "DEF-018", name: "住民避難オペレーション", dept: "防災", deptClass: "dept-emergency", type: "response", tags: ["防災連携"], effects: [{ kind: "percent_reduction", value: 20 }] },
  { id: "DEF-019", name: "広域支援要請", dept: "防災", deptClass: "dept-emergency", type: "emergency", tags: ["防災連携"], effects: [{ kind: "post_resolution_reduction", value: 300 }] },
];

const PHASE = {
  IDLE: "待機",
  CONSULT: "相談時間",
  TRAP: "トラップ宣言",
  ENDED: "終了",
};

const state = {
  turn: 1,
  maxTurn: 5,
  safety: 4000,
  phase: PHASE.IDLE,
  selectedAttack: null,
  attackCandidates: [],
  defenseOptions: [],
  autoSystems: {},
  consultSeconds: 45,
  consultRemaining: 0,
  timerId: null,
};

const el = {
  turn: document.getElementById("turn"),
  safety: document.getElementById("safety"),
  phase: document.getElementById("phase"),
  consultTimer: document.getElementById("consult-timer"),
  consultSeconds: document.getElementById("consult-seconds"),
  attackCandidates: document.getElementById("attack-candidates"),
  defenseOptions: document.getElementById("defense-options"),
  log: document.getElementById("log"),
  initBtn: document.getElementById("init-btn"),
  drawBtn: document.getElementById("draw-btn"),
  trapPhaseBtn: document.getElementById("trap-phase-btn"),
  resolveBtn: document.getElementById("resolve-btn"),
};

el.initBtn.addEventListener("click", initGame);
el.drawBtn.addEventListener("click", drawParentCandidates);
el.trapPhaseBtn.addEventListener("click", moveToTrapPhase);
el.resolveBtn.addEventListener("click", resolveCurrentTurn);

function initGame() {
  clearConsultTimer();
  state.turn = 1;
  state.safety = 4000;
  state.phase = PHASE.IDLE;
  state.selectedAttack = null;
  state.attackCandidates = [];
  state.defenseOptions = [];
  state.consultSeconds = clampConsultSeconds(Number(el.consultSeconds.value));
  el.consultSeconds.value = state.consultSeconds;
  state.consultRemaining = state.consultSeconds;
  state.autoSystems = {
    "AUTO-001": { name: "自動スクラム(トラップ扱い)", reduction: 300, health: 2, enabled: true },
    "AUTO-002": { name: "受動的安全系", reduction: 200, health: 2, enabled: true },
    "AUTO-003": { name: "深層防護基礎", reduction: 100, health: 3, enabled: true },
  };
  el.drawBtn.disabled = false;
  el.trapPhaseBtn.disabled = true;
  el.resolveBtn.disabled = true;
  render();
  setLog("初期化完了。『親が3枚引く（相談開始）』を押してください。");
}

function drawParentCandidates() {
  if (state.turn > state.maxTurn || state.safety <= 0) return;
  state.phase = PHASE.CONSULT;
  state.selectedAttack = null;
  state.attackCandidates = drawRandomCards(ATTACK_CARDS, 3).filter((c) => {
    const limit = c.effects.find((e) => e.kind === "playable_only_on_turn");
    return !limit || limit.value === state.turn;
  });
  if (state.attackCandidates.length < 3) {
    const extra = drawRandomCards(ATTACK_CARDS.filter((c) => c.id !== "ATK-020"), 3 - state.attackCandidates.length);
    state.attackCandidates.push(...extra);
  }
  state.defenseOptions = drawRandomCards(DEFENSE_CARDS, 4);

  state.consultSeconds = clampConsultSeconds(Number(el.consultSeconds.value));
  el.consultSeconds.value = state.consultSeconds;
  state.consultRemaining = state.consultSeconds;
  startConsultTimer();

  el.drawBtn.disabled = true;
  el.trapPhaseBtn.disabled = false;
  el.resolveBtn.disabled = true;
  render();
  setLog("相談時間スタート。攻撃候補を見ながら相談し、攻撃を1枚選択してください。\n相談終了後に『トラップ宣言フェーズへ』を押します。");
}

function moveToTrapPhase() {
  if (!state.selectedAttack) {
    setLog("先に親の攻撃カードを1枚選択してください。");
    return;
  }
  clearConsultTimer();
  state.phase = PHASE.TRAP;
  el.trapPhaseBtn.disabled = true;
  el.resolveBtn.disabled = false;
  setLog("トラップ宣言フェーズ開始（締切: ダメージ計算前）。\n防御カードを最大2枚チェックし、『ダメージ計算を実行』を押してください。");
  render();
}

function resolveCurrentTurn() {
  if (state.phase !== PHASE.TRAP || !state.selectedAttack) return;

  const checked = [...el.defenseOptions.querySelectorAll("input[type=checkbox]:checked")];
  if (checked.length > 2) {
    setLog("防御カードは最大2枚までです。");
    return;
  }

  const playerActions = checked.map((input) => {
    const card = state.defenseOptions.find((c) => c.id === input.value);
    return { playerId: input.dataset.dept, card };
  });

  const result = resolveAttackTurn(state, state.selectedAttack, playerActions);

  const gameEnd = state.safety <= 0 || state.turn >= state.maxTurn;
  if (!gameEnd) {
    state.turn += 1;
    state.phase = PHASE.IDLE;
  } else {
    state.phase = PHASE.ENDED;
  }

  const outcome = state.safety <= 0 ? "\n\n親の勝利（安全度0）" : gameEnd ? "\n\nプレイヤー勝利（5ターン耐久）" : "";
  setLog(formatLog(result.log) + outcome);

  state.selectedAttack = null;
  state.attackCandidates = [];
  state.defenseOptions = [];

  el.drawBtn.disabled = gameEnd;
  el.trapPhaseBtn.disabled = true;
  el.resolveBtn.disabled = true;
  render();
}

function resolveAttackTurn(stateObj, selectedAttack, playerActions) {
  const turnCtx = createTurnContext(stateObj, selectedAttack, playerActions);
  validatePlayerActionLimits(turnCtx);

  const baseDamage = selectedAttack.baseDamage;
  const autoReduction = applyAutoSafetyBoardReductions(turnCtx, selectedAttack);
  const defenseReduction = applyDefenseCardReductions(turnCtx, selectedAttack);
  const attackBonus = applyAttackCardEffects(turnCtx, selectedAttack);

  let damage = Math.max(0, baseDamage + attackBonus.totalBonus - autoReduction.totalReduction - defenseReduction.totalReduction);
  damage = applyPostResolutionReductions(turnCtx, damage);

  stateObj.safety = Math.max(0, stateObj.safety - damage);
  applyStateMutations(turnCtx);

  return {
    finalDamage: damage,
    log: buildResolutionLog(selectedAttack, baseDamage, autoReduction, defenseReduction, attackBonus, damage, stateObj.safety, playerActions),
  };
}

function createTurnContext(stateObj, selectedAttack, playerActions) {
  return {
    state: stateObj,
    selectedAttack,
    playerActions,
    postResolutionReduction: 0,
    percentReduction: 0,
  };
}

function validatePlayerActionLimits(turnCtx) {
  const countByDept = new Map();
  for (const action of turnCtx.playerActions) {
    if (!countByDept.has(action.playerId)) countByDept.set(action.playerId, { install: 0, response: 0, emergency: 0 });
    countByDept.get(action.playerId)[action.card.type] += 1;
  }
  for (const counters of countByDept.values()) {
    if (counters.install > 1 || counters.response > 1 || counters.emergency > 1) {
      throw new Error("同一部署の行動上限を超えています。");
    }
  }
}

function applyAutoSafetyBoardReductions(turnCtx, attack) {
  const items = [];
  let totalReduction = 0;

  const s = turnCtx.state.autoSystems;
  if (s["AUTO-003"].enabled) {
    totalReduction += s["AUTO-003"].reduction;
    items.push({ source: s["AUTO-003"].name, value: s["AUTO-003"].reduction });
  }

  // 自動スクラムはトラップカード的運用: 攻撃が外的事象/外部ハザードの場合に宣言されていれば適用
  const scramDeclared = turnCtx.playerActions.some((a) => a.card.id === "DEF-005");
  if (s["AUTO-001"].enabled && scramDeclared && ["外的事象", "外部ハザード"].includes(attack.category)) {
    if (Math.random() >= 0.05) {
      totalReduction += s["AUTO-001"].reduction;
      items.push({ source: `${s["AUTO-001"].name}(成功)`, value: s["AUTO-001"].reduction });
    } else {
      items.push({ source: `${s["AUTO-001"].name}(失敗)`, value: 0 });
    }
  }

  if (s["AUTO-002"].enabled && attack.tags.some((t) => ["冷却", "熱"].includes(t))) {
    totalReduction += s["AUTO-002"].reduction;
    items.push({ source: s["AUTO-002"].name, value: s["AUTO-002"].reduction });
  }

  const reduceAuto = attack.effects.find((e) => e.kind === "reduce_total_auto_reduction");
  if (reduceAuto) {
    totalReduction = Math.max(0, totalReduction - reduceAuto.value);
    items.push({ source: "攻撃効果:自動軽減低下", value: -reduceAuto.value });
  }

  return { totalReduction, items };
}

function applyDefenseCardReductions(turnCtx, attack) {
  let totalReduction = 0;
  const items = [];

  for (const action of turnCtx.playerActions) {
    for (const effect of action.card.effects) {
      if (effect.kind === "flat_reduction") {
        totalReduction += effect.value;
        items.push({ source: `${action.playerId}/${action.card.name}`, value: effect.value });
      }
      if (effect.kind === "tag_reduction" && attack.tags.some((t) => effect.targetTagsAny.includes(t))) {
        totalReduction += effect.value;
        items.push({ source: `${action.playerId}/${action.card.name}`, value: effect.value });
      }
      if (effect.kind === "percent_reduction") {
        turnCtx.percentReduction = Math.max(turnCtx.percentReduction, effect.value);
        items.push({ source: `${action.playerId}/${action.card.name}(割合)`, value: `${effect.value}%` });
      }
      if (effect.kind === "post_resolution_reduction") {
        turnCtx.postResolutionReduction += effect.value;
      }
    }
  }

  return { totalReduction, items };
}

function applyAttackCardEffects(turnCtx, attack) {
  let totalBonus = 0;
  for (const effect of attack.effects) {
    if (effect.kind === "conditional_bonus_damage") {
      if (effect.condition === "AUTO-002 disabled" && !turnCtx.state.autoSystems["AUTO-002"].enabled) totalBonus += effect.value;
      if (effect.condition === "no_player_response" && !turnCtx.playerActions.some((a) => a.card.type === "response")) totalBonus += effect.value;
      if (effect.condition === "any_auto_system_disabled" && Object.values(turnCtx.state.autoSystems).some((sys) => !sys.enabled)) totalBonus += effect.value;
    }
  }
  return { totalBonus };
}

function applyPostResolutionReductions(turnCtx, damage) {
  let out = Math.max(0, damage - turnCtx.postResolutionReduction);
  if (turnCtx.percentReduction) out = Math.max(0, Math.floor(out * (100 - turnCtx.percentReduction) / 100));
  return out;
}

function applyStateMutations(turnCtx) {
  for (const effect of turnCtx.selectedAttack.effects) {
    if (effect.kind === "disable_system") {
      const system = turnCtx.state.autoSystems[effect.targetSystemId];
      system.health = Math.max(0, system.health - effect.value);
      system.enabled = system.health > 0;
    }
  }
}

function buildResolutionLog(attack, baseDamage, autoReduction, defenseReduction, attackBonus, finalDamage, safetyAfter, actions) {
  return {
    attack: `${attack.id} ${attack.name}`,
    attackCategory: attack.category,
    attackTags: attack.tags,
    declarations: actions.map((a) => `${a.playerId}:${a.card.name}`),
    baseDamage,
    autoReduction,
    defenseReduction,
    attackBonus,
    finalDamage,
    safetyAfter,
  };
}

function startConsultTimer() {
  clearConsultTimer();
  state.consultRemaining = state.consultSeconds;
  state.timerId = setInterval(() => {
    state.consultRemaining -= 1;
    if (state.consultRemaining <= 0) {
      clearConsultTimer();
      state.consultRemaining = 0;
      if (state.phase === PHASE.CONSULT) {
        setLog("相談時間が終了しました。攻撃を選択して『トラップ宣言フェーズへ』を押してください。");
      }
    }
    render();
  }, 1000);
}

function clearConsultTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function drawRandomCards(pool, count) {
  const copy = [...pool];
  shuffle(copy);
  return copy.slice(0, count);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function clampConsultSeconds(v) {
  if (Number.isNaN(v)) return 45;
  return Math.min(180, Math.max(10, Math.floor(v)));
}

function render() {
  el.turn.textContent = state.turn;
  el.safety.textContent = state.safety;
  el.phase.textContent = state.phase;
  el.consultTimer.textContent = `${state.consultRemaining}s`;
  renderAttacks();
  renderDefenses();
}

function renderAttacks() {
  el.attackCandidates.innerHTML = "";
  state.attackCandidates.forEach((card) => {
    const btn = document.createElement("button");
    btn.className = `card attack ${state.selectedAttack?.id === card.id ? "selected" : ""}`;
    btn.innerHTML = `<strong>${card.name}</strong><small>${card.id} / ${card.category}</small><small>ダメージ ${card.baseDamage} / タグ ${card.tags.join("・")}</small>`;
    btn.disabled = state.phase === PHASE.TRAP;
    btn.addEventListener("click", () => {
      state.selectedAttack = card;
      renderAttacks();
    });
    el.attackCandidates.appendChild(btn);
  });
}

function renderDefenses() {
  el.defenseOptions.innerHTML = "";
  state.defenseOptions.forEach((card) => {
    const box = document.createElement("label");
    box.className = `card defense ${card.deptClass}`;
    const lock = state.phase !== PHASE.TRAP ? "disabled" : "";
    box.innerHTML = `
      <input type="checkbox" value="${card.id}" data-dept="${card.dept}" ${lock} />
      <strong>${card.name}</strong>
      <small>${card.id} / 部署: ${card.dept} / 種別: ${card.type}</small>
      <small>タグ: ${card.tags.join("・")}</small>
    `;
    el.defenseOptions.appendChild(box);
  });
}

function formatLog(log) {
  return [
    `攻撃: ${log.attack}`,
    `カテゴリ: ${log.attackCategory}`,
    `タグ: ${log.attackTags.join("・")}`,
    `宣言: ${log.declarations.join(" | ") || "なし"}`,
    `基本ダメージ: ${log.baseDamage}`,
    `自動軽減: ${log.autoReduction.items.map((x) => `${x.source}:${x.value}`).join(" / ") || "なし"}`,
    `防御軽減: ${log.defenseReduction.items.map((x) => `${x.source}:${x.value}`).join(" / ") || "なし"}`,
    `攻撃ボーナス: ${log.attackBonus.totalBonus}`,
    `最終ダメージ: ${log.finalDamage}`,
    `解決後安全度: ${log.safetyAfter}`,
  ].join("\n");
}

function setLog(text) {
  el.log.textContent = text;
}
