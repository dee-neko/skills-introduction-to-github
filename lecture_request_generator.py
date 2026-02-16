#!/usr/bin/env python3
"""CSVから講義依頼文を生成するCLI。"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Dict, List

# 生成対象のCSVカラム定義
CSV_SCHEMA = {
    "講師": {"required": True},
    "講師所属": {"required": True},
    "研修名": {"required": True},
    "講義日時": {"required": True},
    "講義課目": {"required": True},
    "備考": {"required": False},
}

REQUEST_TEMPLATE = """{講師} 様

いつもお世話になっております。
{講師所属}の皆様にご協力いただいております、研修運営担当です。

このたび、下記の講義についてご登壇をご相談したくご連絡いたしました。

- 研修名: {研修名}
- 講義日時: {講義日時}
- 講義課目: {講義課目}

ご都合いかがでしょうか。ご検討のほど、よろしくお願いいたします。
{備考行}
"""


def render_request(row: Dict[str, str]) -> str:
    """CSVの1行を講義依頼文に変換する。"""
    note = row.get("備考", "").strip()
    note_line = f"\n備考: {note}" if note else ""
    values = {**row, "備考行": note_line}
    return REQUEST_TEMPLATE.format(**values).strip() + "\n"


def validate_schema(headers: List[str]) -> None:
    missing_required = [
        name
        for name, rule in CSV_SCHEMA.items()
        if rule["required"] and name not in headers
    ]
    if missing_required:
        joined = ", ".join(missing_required)
        raise ValueError(f"必須カラムが不足しています: {joined}")


def read_csv_rows(csv_path: Path) -> List[Dict[str, str]]:
    """CSVファイルを読み込み、行データを返す。"""
    with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        headers = reader.fieldnames or []
        validate_schema(headers)
        rows = []
        for row_number, row in enumerate(reader, start=2):
            normalized = {key: (value or "").strip() for key, value in row.items()}
            missing_values = [
                col
                for col, rule in CSV_SCHEMA.items()
                if rule["required"] and not normalized.get(col)
            ]
            if missing_values:
                joined = ", ".join(missing_values)
                raise ValueError(
                    f"{row_number}行目: 必須項目に空欄があります ({joined})"
                )
            rows.append(normalized)
        return rows


def generate_requests(csv_path: Path, output_dir: Path) -> List[Path]:
    """CSV1行ごとに1件の講義依頼文を生成して保存する。"""
    rows = read_csv_rows(csv_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    outputs: List[Path] = []
    for index, row in enumerate(rows, start=1):
        text = render_request(row)
        file_name = f"request_{index:03}.txt"
        destination = output_dir / file_name
        destination.write_text(text, encoding="utf-8")
        outputs.append(destination)

    return outputs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CSVの各行から講義依頼文を生成します。"
    )
    parser.add_argument("csv_path", type=Path, help="入力CSVファイルパス")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("generated_requests"),
        help="依頼文の出力先ディレクトリ（既定: generated_requests）",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    generated_files = generate_requests(args.csv_path, args.output_dir)
    print(f"{len(generated_files)}件の講義依頼文を生成しました。")
    for path in generated_files:
        print(f"- {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
