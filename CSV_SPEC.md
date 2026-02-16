# 講義依頼文生成 CSV 仕様

## カラム定義

| カラム名 | 必須/任意 | 説明 |
| --- | --- | --- |
| 講師 | 必須 | 宛名に使用する講師名 |
| 講師所属 | 必須 | 講師の所属組織 |
| 研修名 | 必須 | 講義対象となる研修名 |
| 講義日時 | 必須 | 講義日時 |
| 講義課目 | 必須 | 講義の課目名 |
| 備考 | 任意 | 依頼文末尾に追加する任意情報 |

## 実行方法

```bash
python3 lecture_request_generator.py <入力CSVファイルパス> --output-dir <出力先ディレクトリ>
```

例:

```bash
python3 lecture_request_generator.py sample_lectures.csv --output-dir generated_requests
```

- CSV1行につき、1件の `request_XXX.txt` が生成されます。
- 必須カラムの不足、または必須項目の空欄がある場合はエラー終了します。
