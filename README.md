# TypeScript ブロック崩しゲーム

TypeScriptとHTML5 Canvasで作られたクラシックなブロック崩しゲームです。

## 🎮 ゲームについて

このプロジェクトは、TypeScriptを使用した完全に機能するブロック崩しゲームです。レトロなアーケードゲームの楽しさを現代のウェブ技術で再現しています。

## ✨ 機能

- 🎯 8×5のカラフルなブロック配置
- 🏓 スムーズなパドル操作
- ⚡ リアルタイムな物理演算
- 💯 スコアシステム
- ❤️ ライフシステム（3つの残機）
- 🎨 美しいグラデーションとエフェクト
- ⏸️ 一時停止機能

## 🎮 操作方法

- **← →** キー: パドルを左右に移動
- **スペース** キー: ゲーム開始/一時停止
- **リスタート** ボタン: ゲームを最初から開始

## 🚀 セットアップ

### 必要なもの

- Node.js (v14以上推奨)
- TypeScript

### インストール手順

1. リポジトリをクローン:
```bash
git clone <repository-url>
cd skills-introduction-to-github
```

2. 依存関係をインストール:
```bash
npm install
```

3. TypeScriptをコンパイル:
```bash
npm run build
```

4. ブラウザでindex.htmlを開く

## 📁 プロジェクト構造

```
.
├── src/
│   └── game.ts          # ゲームのメインロジック
├── dist/                # コンパイル済みJavaScript
├── index.html           # HTMLエントリーポイント
├── styles.css           # スタイルシート
├── package.json         # プロジェクト設定
└── tsconfig.json        # TypeScript設定
```

## 🎯 ゲームルール

1. パドルを操作してボールを落とさないようにする
2. すべてのブロックを破壊するとクリア
3. ボールを3回落とすとゲームオーバー
4. 上段のブロックほど高得点

## 🛠️ 技術スタック

- **TypeScript** - 型安全なコード
- **HTML5 Canvas** - グラフィックスレンダリング
- **CSS3** - モダンなスタイリング
- **OOP設計** - Ball, Paddle, Brick, Gameクラス

---

# Introduction to GitHub

_Get started using GitHub in less than an hour._

## Welcome

People use GitHub to build some of the most advanced technologies in the world. Whether you're visualizing data or building a new game, there's a whole community and set of tools on GitHub that can help you do it even better. GitHub Skills' "Introduction to GitHub" exercise guides you through everything you need to start contributing in less than an hour.

- **Who is this for**: New developers, new GitHub users, and students.
- **What you'll learn**: We'll introduce repositories, branches, commits, and pull requests.
- **What you'll build**: We'll make a short Markdown file you can use as your [profile README](https://docs.github.com/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme).
- **Prerequisites**: None. This exercise is a great introduction for your first day on GitHub.
- **How long**: This exercise takes less than one hour to complete.

In this exercise, you will:

1. Create a branch
2. Commit a file
3. Open a pull request
4. Merge your pull request

### How to start this exercise

1. Right-click **Copy Exercise** and open the link in a new tab.

   <a id="copy-exercise">
      <img src="https://img.shields.io/badge/📠_Copy_Exercise-AAA" height="25pt"/>
   </a>

2. In the new tab, most of the prompts will automatically fill in for you.
   - For owner, choose your personal account or an organization to host the repository.
   - We recommend creating a public repository, as private repositories will [use Actions minutes](https://docs.github.chttps://github.com/dee-neko/skills-introduction-to-github/billing/managing-billing-for-github-actions/about-billing-for-github-actions).
   - Scroll down and click the **Create repository** button at the bottom of the form.

3. After your new repository is created, wait about 20 seconds for the exercise to be prepared and buttons updated. You will continue working from your copy of the exercise.
   - The **Copy Exercise** button will deactivate, changing to gray.
   - The **Start Exercise** button will activate, changing to green.
   - You will likely need to refresh the page.

4. Click **Start Exercise**. Follow the step-by-step instructions and feedback will be provided as you progress.

   <a id="start-exercise" href="https://github.com/dee-neko/skills-introduction-to-github/issues/1">
      <img src="https://img.shields.io/badge/🚀_Start_Exercise-008000" height="25pt"/>
   </a>

> [!IMPORTANT]
> The **Start Exercise** button will activate after copying the repository. You will probably need to refresh the page.

---

&copy; 2025 GitHub &bull; [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md) &bull; [MIT License](https://gh.io/mit)