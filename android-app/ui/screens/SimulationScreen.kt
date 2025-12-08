package ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import core.model.KineticsParams
import core.model.KineticsState
import core.model.SimulationSettings
import core.model.simulatePointKinetics
import ui.components.TimeSeriesChart

@Composable
fun SimulationScreen() {
    var rho by remember { mutableStateOf(0.0) }
    var beta by remember { mutableStateOf(0.0065) }
    var lambda by remember { mutableStateOf(0.08) }
    var generationTime by remember { mutableStateOf(1e-4) }
    var timeStep by remember { mutableStateOf(0.001) }
    var duration by remember { mutableStateOf(5.0) }
    var results by remember { mutableStateOf<List<KineticsState>>(emptyList()) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        ParameterField(label = "反応度 ρ", value = rho, onValueChange = { rho = it })
        ParameterField(label = "遅発中性子割合 β", value = beta, onValueChange = { beta = it })
        ParameterField(label = "遅発中性子崩壊定数 λ", value = lambda, onValueChange = { lambda = it })
        ParameterField(label = "世代時間 Λ", value = generationTime, onValueChange = { generationTime = it })
        ParameterField(label = "時間刻み Δt", value = timeStep, onValueChange = { timeStep = it })
        ParameterField(label = "シミュレーション時間", value = duration, onValueChange = { duration = it })

        Button(onClick = {
            if (timeStep <= 0 || duration <= 0 || generationTime <= 0 || lambda <= 0 || beta <= 0) return@Button
            val params = KineticsParams(
                reactivityRho = rho,
                delayedNeutronFraction = beta,
                promptGenerationTime = generationTime,
                delayedNeutronDecayConst = lambda
            )
            val settings = SimulationSettings(timeStep = timeStep, duration = duration)
            results = simulatePointKinetics(params, settings)
        }) {
            Text(text = "再計算")
        }

        TimeSeriesChart(data = results, modifier = Modifier.padding(top = 16.dp))
    }
}

@Composable
private fun ParameterField(
    label: String,
    value: Double,
    onValueChange: (Double) -> Unit
) {
    var text by remember { mutableStateOf(value.toString()) }

    Text(text = label)
    TextField(
        value = text,
        onValueChange = { input ->
            text = input
            input.toDoubleOrNull()?.let { onValueChange(it) }
        },
        modifier = Modifier.padding(bottom = 8.dp)
    )
}
