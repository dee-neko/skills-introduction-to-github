package ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun LessonScreen() {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = "一点炉動特性方程式（遅発中性子1群）",
            style = MaterialTheme.typography.titleLarge
        )
        Text(
            text = "n' = ((ρ - β)/Λ) n + λ C\nC' = (β/Λ) n - λ C",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(top = 8.dp, bottom = 12.dp)
        )
        Text(
            text = "ρ: 反応度, β: 遅発中性子割合, Λ: 世代時間, λ: 崩壊定数。ρ を変更すると即発・遅発成分のバランスが変わり、応答速度が変化します。",
            style = MaterialTheme.typography.bodyMedium
        )
        Text(
            text = "β > 0 のため、ρ が β より小さい場合は遅発中性子が応答を遅らせ、スクラム後の減衰も遅くなります。",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 8.dp)
        )
    }
}
