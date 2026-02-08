#!/usr/bin/env python3
"""Generate lecture request letters from a CSV file."""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

REQUIRED_COLUMNS = ["講師", "講師所属", "研修名", "講義日時", "講義課目"]
OPTIONAL_COLUMNS = ["備考"]

TEMPLATE = """{講師} 様

{講師所属} の皆様には平素より大変お世話になっております。
下記研修にてご講義を賜りたく、お願い申し上げます。

■ 研修名: {研修名}
■ 講義日時: {講義日時}
■ 講義課目: {講義課目}
{備考行}
ご多用のところ恐れ入りますが、ご検討のほどよろしくお願いいたします。
"""


def build_request(row: dict[str, str]) -> str:
    """Build a request letter for a single CSV row."""

    missing = [col for col in REQUIRED_COLUMNS if not row.get(col, "").strip()]
    if missing:
        missing_list = ", ".join(missing)
        raise ValueError(f"必須カラムが未入力です: {missing_list}")

    note = row.get("備考", "").strip()
    note_line = f"■ 備考: {note}" if note else ""

    return TEMPLATE.format(
        **row,
        備考行=note_line,
    ).strip()


def read_csv_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("CSVにヘッダー行がありません。")

        missing_columns = [
            col for col in REQUIRED_COLUMNS if col not in reader.fieldnames
        ]
        if missing_columns:
            missing_list = ", ".join(missing_columns)
            raise ValueError(f"必須カラムが不足しています: {missing_list}")

        rows = []
        for row in reader:
            rows.append({key: (value or "").strip() for key, value in row.items()})
        return rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CSVファイルから講義依頼文を生成します。",
    )
    parser.add_argument(
        "--csv",
        dest="csv_path",
        type=Path,
        required=True,
        help="読み込み対象のCSVファイルパス",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        rows = read_csv_rows(args.csv_path)
    except (OSError, ValueError) as exc:
        print(f"エラー: {exc}", file=sys.stderr)
        return 1

    if not rows:
        print("エラー: CSVにデータ行がありません。", file=sys.stderr)
        return 1

    letters = []
    for index, row in enumerate(rows, start=1):
        try:
            letters.append(build_request(row))
        except ValueError as exc:
            print(f"エラー: {index}行目: {exc}", file=sys.stderr)
            return 1

    print("\n\n---\n\n".join(letters))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
