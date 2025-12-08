"""簡易ストレスシミュレーションツール。

JR東海／EDF を題材に、4ケース×複数シナリオで Net Debt/EBITDA、Free CF、DSCR を比較する。
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import pandas as pd


# =============================
# 設定セクション（ダミー値を配置）
# =============================


@dataclass
class CaseDefinition:
    """ケース定義を保持するデータ構造。"""

    case_id: str
    label: str
    sponsor: str
    scheme_type: str
    revenue: float
    ebitda: float
    net_debt: float
    avg_interest_rate: float
    operating_cf: float
    capex: float
    debt_amort_years: int
    support_share: float


@dataclass
class Scenario:
    """ストレスシナリオ定義を保持するデータ構造。"""

    scenario_id: str
    demand_shock: float
    capex_shock: float
    rate_shock: float
    years: int = 1


# 金額単位：ユーロ圏は億ユーロ、日本は億円に統一する想定。
# 実務利用時に適宜置き換えてください。
CASES: List[CaseDefinition] = [
    CaseDefinition(
        case_id="J0",
        label="JR Central + Linear (current)",
        sponsor="JR Central",
        scheme_type="self-contained",
        revenue=1.0e3,
        ebitda=2.0e2,
        net_debt=5.0e2,
        avg_interest_rate=0.015,
        operating_cf=2.0e2,
        capex=1.0e2,
        debt_amort_years=30,
        support_share=0.0,
    ),
    CaseDefinition(
        case_id="JA",
        label="JR Central + Linear (policy-supported)",
        sponsor="JR Central",
        scheme_type="policy-supported",
        revenue=1.0e3,
        ebitda=2.0e2,
        net_debt=5.0e2,
        avg_interest_rate=0.012,
        operating_cf=2.0e2,
        capex=1.0e2,
        debt_amort_years=35,
        support_share=0.4,
    ),
    CaseDefinition(
        case_id="E0",
        label="EDF + EPR2 (current)",
        sponsor="EDF",
        scheme_type="policy-supported",
        revenue=1.5e3,
        ebitda=3.5e2,
        net_debt=8.0e2,
        avg_interest_rate=0.020,
        operating_cf=3.5e2,
        capex=1.5e2,
        debt_amort_years=30,
        support_share=0.5,
    ),
    CaseDefinition(
        case_id="EB",
        label="EDF + EPR2 (self-contained)",
        sponsor="EDF",
        scheme_type="self-contained",
        revenue=1.5e3,
        ebitda=3.5e2,
        net_debt=8.0e2,
        avg_interest_rate=0.022,
        operating_cf=3.5e2,
        capex=1.5e2,
        debt_amort_years=25,
        support_share=0.0,
    ),
]

SCENARIOS: List[Scenario] = [
    Scenario(scenario_id="base", demand_shock=0.0, capex_shock=0.0, rate_shock=0.0),
    Scenario(scenario_id="demand_-20", demand_shock=-0.2, capex_shock=0.0, rate_shock=0.0),
    Scenario(scenario_id="capex_+30", demand_shock=0.0, capex_shock=0.3, rate_shock=0.0),
    Scenario(scenario_id="rate_+1%", demand_shock=0.0, capex_shock=0.0, rate_shock=0.01),
]


# =============================
# 計算ロジック
# =============================


def compute_baseline_metrics(case: CaseDefinition) -> Dict[str, float]:
    """ケースのベースライン指標を計算する。

    - Net Debt/EBITDA = net_debt / ebitda
    - Free CF = operating_cf - capex
    - DSCR = operating_cf / debt_service（interest + principal）
    """

    net_debt_to_ebitda = case.net_debt / max(case.ebitda, 1e-6)
    interest_expense = case.net_debt * case.avg_interest_rate
    principal_repayment = case.net_debt / max(case.debt_amort_years, 1)
    debt_service = interest_expense + principal_repayment
    dscr = case.operating_cf / max(debt_service, 1e-6)
    free_cf = case.operating_cf - case.capex

    return {
        "net_debt_to_ebitda": net_debt_to_ebitda,
        "free_cf": free_cf,
        "dscr": dscr,
        "interest_expense": interest_expense,
        "principal_repayment": principal_repayment,
        "debt_service": debt_service,
    }


def simulate_case(case: CaseDefinition, scenario: Scenario) -> Dict[str, float]:
    """ショック適用後の主要指標を計算する。"""

    baseline = compute_baseline_metrics(case)

    revenue_stressed = case.revenue * (1 + scenario.demand_shock)
    ebitda_stressed = case.ebitda * (1 + scenario.demand_shock)
    interest_rate_stressed = case.avg_interest_rate + scenario.rate_shock
    interest_expense_stressed = case.net_debt * interest_rate_stressed
    capex_stressed = case.capex * (1 + scenario.capex_shock)

    effective_ebitda = ebitda_stressed + case.support_share * (case.ebitda - ebitda_stressed)
    effective_interest = interest_expense_stressed - case.support_share * (
        interest_expense_stressed - baseline["interest_expense"]
    )

    operating_cf_stressed = effective_ebitda
    principal_repayment_stressed = baseline["principal_repayment"]
    debt_service_stressed = effective_interest + principal_repayment_stressed
    dscr_stressed = operating_cf_stressed / max(debt_service_stressed, 1e-6)
    free_cf_stressed = operating_cf_stressed - capex_stressed

    additional_debt = max(0.0, -free_cf_stressed)
    net_debt_stressed = case.net_debt + additional_debt
    net_debt_to_ebitda_stressed = net_debt_stressed / max(effective_ebitda, 1e-6)

    return {
        "revenue_stressed": revenue_stressed,
        "ebitda_stressed": ebitda_stressed,
        "interest_rate_stressed": interest_rate_stressed,
        "capex_stressed": capex_stressed,
        "effective_ebitda": effective_ebitda,
        "effective_interest": effective_interest,
        "operating_cf_stressed": operating_cf_stressed,
        "principal_repayment_stressed": principal_repayment_stressed,
        "debt_service_stressed": debt_service_stressed,
        "dscr": dscr_stressed,
        "free_cf": free_cf_stressed,
        "additional_debt": additional_debt,
        "net_debt_stressed": net_debt_stressed,
        "net_debt_to_ebitda": net_debt_to_ebitda_stressed,
    }


def build_results_dataframe(
    cases: List[CaseDefinition], scenarios: List[Scenario]
) -> pd.DataFrame:
    """各ケース×シナリオの指標をまとめた DataFrame を生成する。"""

    records: Dict[str, Dict[str, float]] = {}

    for case in cases:
        base_metrics = compute_baseline_metrics(case)
        case_record: Dict[str, float] = {
            "base_net_debt_to_ebitda": base_metrics["net_debt_to_ebitda"],
            "base_free_cf": base_metrics["free_cf"],
            "base_dscr": base_metrics["dscr"],
        }

        for scenario in scenarios:
            stressed = simulate_case(case, scenario)
            prefix = scenario.scenario_id
            case_record[f"{prefix}_net_debt_to_ebitda"] = stressed["net_debt_to_ebitda"]
            case_record[f"{prefix}_free_cf"] = stressed["free_cf"]
            case_record[f"{prefix}_dscr"] = stressed["dscr"]

        records[case.case_id] = case_record

    df = pd.DataFrame.from_dict(records, orient="index")
    return df


# =============================
# エントリーポイント
# =============================


def main() -> None:
    """ダミー設定を用いたサンプル実行。"""

    df = build_results_dataframe(CASES, SCENARIOS)
    df_rounded = df.round(2)
    print("=== ストレスシミュレーション結果（小数点以下2桁）===")
    print(df_rounded)
    df_rounded.to_csv("simulation_results.csv", index=True)


if __name__ == "__main__":
    main()
