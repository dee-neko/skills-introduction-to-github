# 試験問題学習アプリ MVP ワイヤー（画面ラフ）

## 画面構成（1ページ完結・オフライン）
```
┌────────────────────────────────────┐
│ ヘッダー：タイトル／年度選択（任意）│
├────────────────────────────────────┤
│ 説明文：10問固定、採点ボタン案内    │
├────────────────────────────────────┤
│ 成績サマリー（採点前は非表示）        │
│  - 合計得点・正答率                  │
│  - 分野別正答表（category集計）       │
├────────────────────────────────────┤
│ 問題リスト（CSVから生成）            │
│  [Q1] 問題文（数式は簡略表記）         │
│       ( ) ラジオボタン4択             │
│       採点後：正誤アイコン＋解説表示    │
│  [Q2] ...                             │
│  ...                                  │
├────────────────────────────────────┤
│ ボタン群                             │
│  - 採点する                          │
│  - もう一度チャレンジ（リセット）     │
├────────────────────────────────────┤
│ 履歴表示（localStorage）              │
│  - 最終受験日時・得点・正答率        │
│  - 分野別スコアの前回値（任意）       │
└────────────────────────────────────┘
```

## コンポーネントと挙動
- **CSVローダー**：`questions.csv` を fetch し、配列化。10問未満なら全件出題。外部CDN不要。
- **問題レンダラー**：各設問にラジオボタン4択を生成。スマホは1カラムでタップ領域を広めに。
- **採点ロジック**：採点ボタン押下で
  - 各問の正誤判定、正誤アイコン（例：○/×）と配色を付与
  - 各問の直下に解説ブロックを展開
  - スコアと分野別集計（`category` 列）をサマリーに表示
  - 履歴を localStorage に保存（得点・正答率・timestamp・分野別表）
- **再挑戦**：ラジオ選択状態とサマリーをリセットし、スクロールをトップへ戻す。CSVを再読込して同じ10問を表示。

## レイアウト指針（レスポンシブ）
- **1カラム基調**：最大幅 960px、スマホ（<768px）は左右余白を広めに。
- **タップしやすさ**：選択肢カードを block 化、min-height 44px、フォーカスリングを明示。
- **配色例**：
  - 正解: #0F7B6C 背景薄緑＋○アイコン
  - 不正解: #C62828 背景薄赤＋×アイコン
  - 通常: #F4F4F5 背景、#1F2933 文字
- **フォント**：システムフォント（"Noto Sans JP", "Segoe UI", sans-serif）。

## HTMLスケルトン例
`index.html` の骨格イメージ（JSでCSVを読み込み・描画）
```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>放射線取扱主任者 試験練習</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>令和7年度 物理 模擬</h1>
    <p>10問を解答し、採点ボタンで結果を確認できます。</p>
  </header>

  <section id="results" hidden>
    <h2>結果</h2>
    <p id="score-summary">正答率 0% (0/0)</p>
    <table id="category-table"></table>
  </section>

  <main id="questions"></main>

  <div class="actions">
    <button id="grade">採点する</button>
    <button id="retry" type="button">もう一度チャレンジ</button>
  </div>

  <section id="history" hidden>
    <h2>前回の結果</h2>
    <p id="history-summary"></p>
    <table id="history-category"></table>
  </section>

  <script src="app.js"></script>
</body>
</html>
```

## CSVフォーマット案（試作2〜3問）
- 4択固定を想定。列はカンマ区切り。`answer` は 1〜4 の数値。
- `category` は分野集計用。空でも可。

列: `id,question,choice1,choice2,choice3,choice4,answer,explanation,category`

```
id,question,choice1,choice2,choice3,choice4,answer,explanation,category
Q1,"光子エネルギーEと波長λの関係として正しいのはどれか。",E = hc/λ,E = hλ/c,E = c/(hλ),E = λ/(hc),1,"プランク定数hと光速cを用い、E = hc/λで表される。",物理基礎
Q2,"半減期T1/2と壊変定数λの関係式はどれか。",T1/2 = λ ln2,T1/2 = ln2 / λ,T1/2 = λ / ln2,T1/2 = 1 / (λ ln2),2,"放射能の減衰 N(t)=N0 e^{-λt} より T1/2 = ln2 / λ。",放射能
Q3,"1 Ci は毎秒何回の崩壊に相当するか。",3.7×10^7 Bq,3.7×10^10 Bq,1×10^6 Bq,1×10^10 Bq,2,"1 Bq=1 s^{-1}、1 Ci = 3.7×10^{10} s^{-1}。",単位
```

## 実装ステップの目安
1. 上記CSVを `questions.csv` として設置し、JSでfetch→パース→配列化。
2. 10問固定でレンダリング（試作時は配列長が少なければ全件表示）。
3. 採点処理で正誤表示と解説挿入。サマリーと分野別表を更新。
4. localStorage に結果を保存し、次回訪問時に履歴を表示。
5. スタイル調整：スマホ優先の1カラム、フォーカスリング、ボタン配置を整える。
```
