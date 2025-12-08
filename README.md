# Introduction to GitHub

_Get started using GitHub in less than an hour._

## Welcome

People use GitHub to build some of the most advanced technologies in the world. Whether you’re visualizing data or building a new game, there’s a whole community and set of tools on GitHub that can help you do it even better. GitHub Skills’ “Introduction to GitHub” exercise guides you through everything you need to start contributing in less than an hour.

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

## Reactor kinetics learning app (Android draft)

This branch also includes a lightweight Kotlin/Jetpack Compose draft for a point-kinetics learning app targeting Android devices. The draft lives in `android-app/` and focuses on:

- **Core model**: 1-group delayed neutron point kinetics with adjustable ρ, β, Λ, λ and Euler integration (`core/model/ReactorKinetics.kt`).
- **Visualization**: Minimal Compose `Canvas` line chart for neutron density time-series (`ui/components/TimeSeriesChart.kt`).
- **UI stubs**: Parameter input and simulation trigger (`ui/screens/SimulationScreen.kt`), lesson text (`LessonScreen.kt`), and quiz interactions (`QuizScreen.kt`).

 These files are scaffolding to align with the requested feature breakdown and can be moved into a full Android project structure for compilation.

### Where the Android draft lives

- ソース配置: `android-app/`
  - モデル: `android-app/core/model/ReactorKinetics.kt`
  - グラフ描画: `android-app/ui/components/TimeSeriesChart.kt`
  - 画面スタブ: `android-app/ui/screens/SimulationScreen.kt`, `LessonScreen.kt`, `QuizScreen.kt`

### 動かし方（既存のAndroid Studioプロジェクトへ取り込む場合）

1. Android Studioで、新規に **Empty Compose Activity**（Kotlin, Compose有効）プロジェクトを作成し、`minSdk` を 24 以上に設定します。
2. 生成されたプロジェクト直下（例: `app/src/main/java/...` のパッケージ配下）に、このリポジトリの `android-app/core` と `android-app/ui` ディレクトリをコピーします。
3. パッケージ名をプロジェクトに合わせて調整します（`package` 行とインポート先）。
4. `SimulationScreen` などの画面を `setContent { ... }` から呼び出し、`MainActivity` に組み込みます。
5. Gradle Sync を実行し、`Run` またはエミュレータ／実機でビルド・実行します。

> 注: このリポジトリには `build.gradle` などのプロジェクト設定は含まれていません。上記の手順で既存のCompose対応プロジェクトにコードを配置して動作させてください。