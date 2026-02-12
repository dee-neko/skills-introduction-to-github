# 講義依頼文書生成ツール

CSVファイルから講義依頼文書を自動生成するWebアプリケーション

## 概要

講義依頼業務において、複数の講師に対して同様の依頼文書を作成する作業は繰り返しが多く時間がかかります。このツールは、CSVファイルから講義依頼文書を自動生成し、メールクライアントで使用できる下書きファイル（.eml形式）またはプレーンテキスト（.txt形式）として出力することで、この作業を大幅に効率化します。

## 機能

- ✅ CSVファイルのアップロード（ドラッグ&ドロップ対応）
- ✅ データプレビューとバリデーション
- ✅ テンプレートのカスタマイズ（Handlebars構文）
- ✅ 文書の一括生成とプレビュー
- ✅ メール下書きの自動生成（.eml形式）
- ✅ テキストファイルの出力（.txt形式）
- ✅ 個別・一括ダウンロード機能

## デモ

（GitHub Pagesでデプロイ後、ここにURLを追加）

## 使い方

### 1. CSVファイルを準備

以下のカラムを含むCSVファイルを用意してください：

| カラム名 | 説明 | 必須 |
|---------|------|------|
| 課目名 | 講義の課目名 | ✓ |
| 講師名 | 講師の名前 | ✓ |
| 所属 | 講師の所属 | ✓ |
| 講義日時 | 講義の日時 | ✓ |
| 講義場所 | 講義の場所 | ✓ |
| 担当者名 | 依頼担当者の名前 | ✓ |
| 担当者メール | 依頼担当者のメールアドレス | ✓ |
| 備考 | その他の備考事項 | - |

**サンプル**: [`examples/sample-data.csv`](examples/sample-data.csv) をダウンロード

### 2. アプリケーションを開く

ブラウザで `index.html` を開きます。

### 3. CSVファイルをアップロード

- ドラッグ&ドロップ、またはファイル選択ボタンでCSVファイルをアップロード
- データプレビューが表示されます

### 4. テンプレートを確認・編集（オプション）

- デフォルトテンプレートが表示されます
- 必要に応じて編集してください
- テンプレート編集ガイド: [`examples/template-guide.md`](examples/template-guide.md)

### 5. 文書を生成

- 「文書を生成」ボタンをクリック
- 生成された文書がプレビュー表示されます

### 6. エクスポート

- 出力形式（.eml / .txt）を選択
- 個別ダウンロード、または一括ダウンロード

## ローカル実行方法

### 必要な環境

- モダンなWebブラウザ（Chrome、Firefox、Safari、Edgeの最新版）
- ローカルHTTPサーバー（開発時）

### ローカルサーバーの起動

```bash
# Python 3の場合
python -m http.server 8080

# Node.jsの場合
npx serve .
```

ブラウザで `http://localhost:8080` にアクセス

## 技術スタック

- **HTML5 + CSS3 + JavaScript (ES6+)**: フレームワーク不要のシンプルな構成
- **PapaParse**: CSV解析ライブラリ
- **Handlebars.js**: テンプレートエンジン
- **FileSaver.js**: ファイルダウンロード

すべてのライブラリはCDN経由で読み込まれるため、追加のインストールは不要です。

## ファイル構成

```
lecture-request-generator/
├── index.html                           # メインページ
├── css/
│   ├── reset.css                        # CSSリセット
│   ├── variables.css                    # CSS変数
│   └── style.css                        # メインスタイル
├── js/
│   ├── app.js                           # アプリケーション制御
│   ├── modules/
│   │   ├── csv-handler.js               # CSV解析
│   │   ├── data-validator.js            # データバリデーション
│   │   ├── template-manager.js          # テンプレート管理
│   │   ├── document-generator.js        # 文書生成
│   │   └── email-exporter.js            # メール出力
│   └── utils/
│       ├── date-formatter.js            # 日付フォーマット
│       └── helpers.js                   # ヘルパー関数
├── templates/
│   └── default-template.hbs             # デフォルトテンプレート
├── examples/
│   ├── sample-data.csv                  # サンプルCSV
│   └── template-guide.md                # テンプレートガイド
└── README.md                            # このファイル
```

## セキュリティ

- **クライアントサイド完結**: すべての処理がブラウザ上で完結するため、データがサーバーに送信されることはありません
- **XSS対策**: ユーザー入力のHTMLエスケープ
- **CSVインジェクション対策**: セル先頭の数式記号を無効化

## ブラウザ互換性

- Chrome（最新版）
- Firefox（最新版）
- Safari（最新版）
- Edge（最新版）

## トラブルシューティング

### CSVファイルがアップロードできない

- ファイルサイズが5MB以内か確認してください
- 拡張子が `.csv` であることを確認してください
- 文字エンコーディングがUTF-8であることを確認してください

### テンプレートエラーが表示される

- テンプレート構文が正しいか確認してください
- `{{変数名}}` の形式が正確か確認してください
- 詳細は [`examples/template-guide.md`](examples/template-guide.md) を参照

### メールクライアントで開けない

- .eml形式を選択しているか確認してください
- メールクライアントが.eml形式に対応しているか確認してください
- テキスト形式（.txt）を試してみてください

## 将来の拡張機能

- テンプレート保存・管理機能（localStorage）
- Excel（.xlsx）ファイル対応
- PDF出力機能
- HTMLメールプレビュー
- Gmail / Outlook API連携

## ライセンス

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## コントリビューション

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 作者

Created with Claude Code

---

**Note**: このプロジェクトは教育目的で作成されました。
