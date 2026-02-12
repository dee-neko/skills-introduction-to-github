const ATTACK_CARDS = [
  { id: "ATK-001", name: "外部電源喪失", tags: ["電源", "拡大"], baseDamage: 700, effects: [{ kind: "disable_system", targetSystemId: "AUTO-002", value: 1 }] },
  { id: "ATK-002", name: "冷却ポンプ停止", tags: ["冷却", "熱"], baseDamage: 800, effects: [{ kind: "conditional_bonus_damage", condition: "AUTO-002 disabled", value: 200 }] },
  { id: "ATK-006", name: "手順逸脱", tags: ["人的"], baseDamage: 600, effects: [{ kind: "conditional_bonus_damage", condition: "no_player_response", value: 200 }] },
  { id: "ATK-011", name: "震度6弱地震", tags: ["地震", "複合"], baseDamage: 900, effects: [{ kind: "disable_system", targetSystemId: "AUTO-003", value: 1 }] },
  { id: "ATK-016", name: "複合災害シナリオA", tags: ["複合", "地震", "停電"], baseDamage: 1100, effects: [{ kind: "conditional_bonus_damage", condition: "any_auto_system_disabled", value: 200 }] },
  { id: "ATK-020", name: "最終波状攻撃", tags: ["複合", "最終"], baseDamage: 1300, effects: [{ kind: "playable_only_on_turn", value: 5 }, { kind: "reduce_total_auto_reduction", value: 200 }] },
];

const DEFENSE_CARDS = [
  { id: "DEF-005", name: "中央監視室アラート", type: "response", tags: ["監視", "制御"], effects: [{ kind: "flat_reduction", value: 250 }] },
  { id: "DEF-009", name: "非常用ディーゼル運用強化", type: "install", tags: ["拡大防止"], effects: [{ kind: "tag_reduction", targetTagsAny: ["電源"], value: 300 }] },
  { id: "DEF-010", name: "代替注水ライン切替", type: "emergency", tags: ["拡大防止"], effects: [{ kind: "tag_reduction", targetTagsAny: ["冷却"], value: 350 }] },
  { id: "DEF-014", name: "区域隔離シャッター", type: "emergency", tags: ["影響緩和"], effects: [{ kind: "flat_reduction", value: 400 }] },
  { id: "DEF-018", name: "住民避難オペレーション", type: "response", tags: ["防災連携"], effects: [{ kind: "percent_reduction", value: 20 }] },
  { id: "DEF-019", name: "広域支援要請", type: "emergency", tags: ["防災連携"], effects: [{ kind: "post_resolution_reduction", value: 300 }] },
];

const state = {
  turn: 1,
  maxTurn: 5,
  safety: 4000,
  selectedAttack: null,
  attackCandidates: [],
  defenseOptions: [],
  autoSystems: {},
};

const el = {
  turn: document.getElementById("turn"),
  safety: document.getElementById("safety"),
  attackCandidates: document.getElementById("attack-candidates"),
  defenseOptions: document.getElementById("defense-options"),
  log: document.getElementById("log"),
  initBtn: document.getElementById("init-btn"),
  drawBtn: document.getElementById("draw-btn"),
  resolveBtn: document.getElementById("resolve-btn"),
};

el.initBtn.addEventListener("click", initGame);
el.drawBtn.addEventListener("click", drawParentCandidates);
el.resolveBtn.addEventListener("click", resolveCurrentTurn);

function initGame() {
  state.turn = 1;
  state.safety = 4000;
  state.selectedAttack = null;
  state.attackCandidates = [];
  state.defenseOptions = [];
  state.autoSystems = {
    "AUTO-001": { name: "自動スクラム", reduction: 300, health: 2, enabled: true },
    "AUTO-002": { name: "受動的安全系", reduction: 200, health: 2, enabled: true },
    "AUTO-003": { name: "深層防護基礎", reduction: 100, health: 3, enabled: true },
  };
  el.drawBtn.disabled = false;
  el.resolveBtn.disabled = true;
  render();
  setLog("ゲームを初期化しました。『親が3枚引く』を押してください。");
}

function drawParentCandidates() {
  if (state.turn > state.maxTurn || state.safety <= 0) return;
  state.selectedAttack = null;
  state.attackCandidates = drawRandomCards(ATTACK_CARDS, 3).filter((c) => {
    const playRule = c.effects.find((e) => e.kind === "playable_only_on_turn");
    return !playRule || playRule.value === state.turn;
  });
  if (state.attackCandidates.length === 0) {
    state.attackCandidates = drawRandomCards(ATTACK_CARDS.filter((c) => c.id !== "ATK-020"), 3);
  }
  state.defenseOptions = drawRandomCards(DEFENSE_CARDS, 4);
  el.resolveBtn.disabled = true;
  render();
  setLog("親の攻撃候補を表示しました。攻撃を1枚選び、防御カードを最大2枚チェックして『選択攻撃を解決』を押してください。");
}

function resolveCurrentTurn() {
  if (!state.selectedAttack) {
    setLog("先に攻撃カードを1枚選択してください。");
    return;
  }

  const checked = [...el.defenseOptions.querySelectorAll("input[type=checkbox]:checked")];
  if (checked.length > 2) {
    setLog("防御カードは最大2枚までです。");
    return;
  }

  const playerActions = checked.map((input) => {
    const card = state.defenseOptions.find((c) => c.id === input.value);
    return { playerId: input.dataset.playerId, card };
  });

  const result = resolveAttackTurn(state, state.selectedAttack, playerActions);

  const gameEnd = state.safety <= 0 || state.turn >= state.maxTurn;
  if (!gameEnd) state.turn += 1;

  render();
  const outcome = state.safety <= 0 ? "\n\n親の勝利（安全度が0以下）" : state.turn > state.maxTurn ? "\n\nプレイヤー勝利（5ターン耐久）" : "";
  setLog(formatLog(result.log) + outcome);

  state.selectedAttack = null;
  state.attackCandidates = [];
  state.defenseOptions = [];

  if (gameEnd) {
    el.drawBtn.disabled = true;
    el.resolveBtn.disabled = true;
  } else {
    el.drawBtn.disabled = false;
    el.resolveBtn.disabled = true;
  }
  render();
}

function resolveAttackTurn(stateObj, selectedAttack, playerActions) {
  const turnCtx = createTurnContext(stateObj, selectedAttack, playerActions);
  validatePlayerActionLimits(turnCtx);

  const baseDamage = getBaseDamage(selectedAttack);
  const autoReductionDetail = applyAutoSafetyBoardReductions(turnCtx, selectedAttack);
  const defenseReductionDetail = applyDefenseCardReductions(turnCtx, selectedAttack);
  const attackBonusDetail = applyAttackCardEffects(turnCtx, selectedAttack);
  const layerBonus = calcLayerSynergyBonus(turnCtx);

  let provisionalDamage =
    baseDamage +
    attackBonusDetail.totalBonus -
    autoReductionDetail.totalReduction -
    defenseReductionDetail.totalReduction -
    layerBonus;

  provisionalDamage = Math.max(0, provisionalDamage);
  const finalDamage = applyPostResolutionReductions(turnCtx, provisionalDamage);

  stateObj.safety = Math.max(0, stateObj.safety - finalDamage);
  applyStateMutations(turnCtx);

  return {
    finalDamage,
    log: buildResolutionLog(selectedAttack, baseDamage, autoReductionDetail, defenseReductionDetail, layerBonus, attackBonusDetail, finalDamage, stateObj.safety),
  };
}

function createTurnContext(stateObj, selectedAttack, playerActions) {
  return {
    turn: stateObj.turn,
    selectedAttack,
    playerActions,
    state: stateObj,
    usedTags: new Set(playerActions.flatMap((a) => a.card.tags || [])),
    postResolutionReduction: 0,
  };
}

function validatePlayerActionLimits(turnCtx) {
  const perPlayer = new Map();
  for (const action of turnCtx.playerActions) {
    if (!perPlayer.has(action.playerId)) perPlayer.set(action.playerId, { install: 0, response: 0, emergency: 0 });
    perPlayer.get(action.playerId)[action.card.type] += 1;
  }
  for (const counters of perPlayer.values()) {
    if (counters.install > 1 || counters.response > 1 || counters.emergency > 1) {
      throw new Error("同一プレイヤーの行動上限を超えています。");
    }
  }
}

function getBaseDamage(attack) {
  return attack.baseDamage;
}

function applyAutoSafetyBoardReductions(turnCtx, attack) {
  const items = [];
  let totalReduction = 0;
  const systems = turnCtx.state.autoSystems;

  if (systems["AUTO-003"].enabled) {
    totalReduction += systems["AUTO-003"].reduction;
    items.push({ source: systems["AUTO-003"].name, value: systems["AUTO-003"].reduction });
  }

  if (systems["AUTO-001"].enabled && attack.tags.some((t) => ["地震", "複合"].includes(t))) {
    totalReduction += systems["AUTO-001"].reduction;
    items.push({ source: systems["AUTO-001"].name, value: systems["AUTO-001"].reduction });
  }

  if (systems["AUTO-002"].enabled && attack.tags.some((t) => ["冷却", "熱"].includes(t))) {
    totalReduction += systems["AUTO-002"].reduction;
    items.push({ source: systems["AUTO-002"].name, value: systems["AUTO-002"].reduction });
  }

  const reduceAuto = attack.effects.find((e) => e.kind === "reduce_total_auto_reduction");
  if (reduceAuto) {
    totalReduction = Math.max(0, totalReduction - reduceAuto.value);
    items.push({ source: "攻撃効果(自動軽減低下)", value: -reduceAuto.value });
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
        items.push({ source: action.card.name, value: effect.value });
      }
      if (effect.kind === "tag_reduction" && attack.tags.some((t) => effect.targetTagsAny.includes(t))) {
        totalReduction += effect.value;
        items.push({ source: action.card.name, value: effect.value });
      }
      if (effect.kind === "percent_reduction") {
        turnCtx.percentReduction = Math.max(turnCtx.percentReduction || 0, effect.value);
        items.push({ source: `${action.card.name}(割合軽減)`, value: `${effect.value}%` });
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
      if (effect.condition === "AUTO-002 disabled" && !turnCtx.state.autoSystems["AUTO-002"].enabled) {
        totalBonus += effect.value;
      }
      if (effect.condition === "no_player_response" && !turnCtx.playerActions.some((a) => a.card.type === "response")) {
        totalBonus += effect.value;
      }
      if (effect.condition === "any_auto_system_disabled" && Object.values(turnCtx.state.autoSystems).some((s) => !s.enabled)) {
        totalBonus += effect.value;
      }
    }
  }

  return { totalBonus };
}

function calcLayerSynergyBonus(turnCtx) {
  const layers = new Set();
  for (const tag of turnCtx.usedTags) {
    if (["予防", "監視", "制御", "拡大防止", "影響緩和", "防災連携"].includes(tag)) layers.add(tag);
  }
  return layers.size >= 3 ? 200 : layers.size >= 2 ? 100 : 0;
}

function applyPostResolutionReductions(turnCtx, damage) {
  let out = Math.max(0, damage - turnCtx.postResolutionReduction);
  if (turnCtx.percentReduction) {
    out = Math.max(0, Math.floor(out * (100 - turnCtx.percentReduction) / 100));
  }
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

function buildResolutionLog(attack, baseDamage, autoReduction, defenseReduction, layerBonus, attackBonus, finalDamage, safetyAfter) {
  return {
    attack: `${attack.id} ${attack.name}`,
    baseDamage,
    autoReduction,
    defenseReduction,
    layerBonus,
    attackBonus,
    finalDamage,
    safetyAfter,
  };
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

function render() {
  el.turn.textContent = state.turn;
  el.safety.textContent = state.safety;
  renderAttacks();
  renderDefenses();
}

function renderAttacks() {
  el.attackCandidates.innerHTML = "";
  state.attackCandidates.forEach((card) => {
    const btn = document.createElement("button");
    btn.className = `card attack ${state.selectedAttack?.id === card.id ? "selected" : ""}`;
    btn.innerHTML = `<strong>${card.name}</strong><small>${card.id} / ダメージ ${card.baseDamage}</small><small>タグ: ${card.tags.join("・")}</small>`;
    btn.addEventListener("click", () => {
      state.selectedAttack = card;
      el.resolveBtn.disabled = false;
      renderAttacks();
    });
    el.attackCandidates.appendChild(btn);
  });
}

function renderDefenses() {
  el.defenseOptions.innerHTML = "";
  const playerIds = ["A", "B", "C", "D"];
  state.defenseOptions.forEach((card, idx) => {
    const box = document.createElement("label");
    box.className = "card defense";
    const playerId = playerIds[idx % playerIds.length];
    box.innerHTML = `
      <input type="checkbox" value="${card.id}" data-player-id="${playerId}" />
      <strong>${card.name}</strong>
      <small>${card.id} / 種別: ${card.type}</small>
      <small>タグ: ${card.tags.join("・")}</small>
    `;
    el.defenseOptions.appendChild(box);
  });
}

function formatLog(log) {
  return [
    `攻撃: ${log.attack}`,
    `基本ダメージ: ${log.baseDamage}`,
    `自動軽減: ${log.autoReduction.items.map((i) => `${i.source}:${i.value}`).join(", ") || "なし"}`,
    `防御軽減: ${log.defenseReduction.items.map((i) => `${i.source}:${i.value}`).join(", ") || "なし"}`,
    `層ボーナス: ${log.layerBonus}`,
    `攻撃ボーナス: ${log.attackBonus.totalBonus}`,
    `最終ダメージ: ${log.finalDamage}`,
    `解決後安全度: ${log.safetyAfter}`,
  ].join("\n");
}

function setLog(text) {
  el.log.textContent = text;
}
