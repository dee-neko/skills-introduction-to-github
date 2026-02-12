const suits = ["♠", "♥", "♦", "♣"];
const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];

const handLabels = [
  "ハイカード",
  "ワンペア",
  "ツーペア",
  "スリーカード",
  "ストレート",
  "フラッシュ",
  "フルハウス",
  "フォーカード",
  "ストレートフラッシュ",
  "ロイヤルフラッシュ",
];

const playerCardsEl = document.getElementById("player-cards");
const dealerCardsEl = document.getElementById("dealer-cards");
const playerHandEl = document.getElementById("player-hand");
const dealerHandEl = document.getElementById("dealer-hand");
const resultEl = document.getElementById("result");
const dealButton = document.getElementById("deal-button");

dealButton.addEventListener("click", () => {
  const deck = createDeck();
  shuffle(deck);

  const player = deck.splice(0, 5);
  const dealer = deck.splice(0, 5);

  renderCards(playerCardsEl, player);
  renderCards(dealerCardsEl, dealer);

  const playerScore = evaluateHand(player);
  const dealerScore = evaluateHand(dealer);

  playerHandEl.textContent = `役: ${handLabels[playerScore.rank]}`;
  dealerHandEl.textContent = `役: ${handLabels[dealerScore.rank]}`;

  const outcome = compareScores(playerScore, dealerScore);
  resultEl.textContent = outcome > 0 ? "あなたの勝ち！" : outcome < 0 ? "ディーラーの勝ち！" : "引き分け！";
});

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function renderCards(container, cards) {
  container.innerHTML = "";
  cards.forEach((card) => {
    const el = document.createElement("div");
    const isRed = card.suit === "♥" || card.suit === "♦";
    el.className = `card ${isRed ? "red" : ""}`.trim();
    el.textContent = `${card.rank}${card.suit}`;
    container.appendChild(el);
  });
}

function cardValue(rank) {
  if (rank === "A") return 14;
  if (rank === "K") return 13;
  if (rank === "Q") return 12;
  if (rank === "J") return 11;
  return rank;
}

function evaluateHand(hand) {
  const values = hand.map((c) => cardValue(c.rank)).sort((a, b) => b - a);
  const suitsInHand = hand.map((c) => c.suit);

  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);

  const grouped = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const isFlush = suitsInHand.every((s) => s === suitsInHand[0]);
  const uniqueAsc = [...new Set(values)].sort((a, b) => a - b);
  let straightHigh = null;

  if (uniqueAsc.length === 5) {
    if (uniqueAsc[4] - uniqueAsc[0] === 4) straightHigh = uniqueAsc[4];
    else if (JSON.stringify(uniqueAsc) === JSON.stringify([2, 3, 4, 5, 14])) straightHigh = 5;
  }

  if (isFlush && straightHigh === 14) return { rank: 9, tiebreakers: [14] };
  if (isFlush && straightHigh) return { rank: 8, tiebreakers: [straightHigh] };

  if (grouped[0][1] === 4) {
    const kicker = grouped[1][0];
    return { rank: 7, tiebreakers: [grouped[0][0], kicker] };
  }

  if (grouped[0][1] === 3 && grouped[1][1] === 2) {
    return { rank: 6, tiebreakers: [grouped[0][0], grouped[1][0]] };
  }

  if (isFlush) return { rank: 5, tiebreakers: values };
  if (straightHigh) return { rank: 4, tiebreakers: [straightHigh] };

  if (grouped[0][1] === 3) {
    const kickers = grouped.slice(1).map(([v]) => v).sort((a, b) => b - a);
    return { rank: 3, tiebreakers: [grouped[0][0], ...kickers] };
  }

  if (grouped[0][1] === 2 && grouped[1][1] === 2) {
    const pairs = [grouped[0][0], grouped[1][0]].sort((a, b) => b - a);
    const kicker = grouped[2][0];
    return { rank: 2, tiebreakers: [...pairs, kicker] };
  }

  if (grouped[0][1] === 2) {
    const kickers = grouped.slice(1).map(([v]) => v).sort((a, b) => b - a);
    return { rank: 1, tiebreakers: [grouped[0][0], ...kickers] };
  }

  return { rank: 0, tiebreakers: values };
}

function compareScores(a, b) {
  if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;

  const maxLen = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < maxLen; i++) {
    const av = a.tiebreakers[i] || 0;
    const bv = b.tiebreakers[i] || 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}
