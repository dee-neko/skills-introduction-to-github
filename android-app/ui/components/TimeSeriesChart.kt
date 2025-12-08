package ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import core.model.KineticsState

@Composable
fun TimeSeriesChart(
    data: List<KineticsState>,
    modifier: Modifier = Modifier,
    lineColor: Color = Color(0xFF1E88E5)
) {
    if (data.isEmpty()) return

    Canvas(modifier = modifier.fillMaxSize()) {
        val times = data.map { it.time }
        val values = data.map { it.neutronDensity }
        val minTime = times.minOrNull() ?: 0.0
        val maxTime = times.maxOrNull() ?: 1.0
        val minValue = values.minOrNull() ?: 0.0
        val maxValue = values.maxOrNull() ?: 1.0
        val rangeTime = (maxTime - minTime).takeIf { it > 0 } ?: 1.0
        val rangeValue = (maxValue - minValue).takeIf { it > 0 } ?: 1.0

        val path = Path()
        data.forEachIndexed { index, point ->
            val x = ((point.time - minTime) / rangeTime).toFloat() * size.width
            val y = size.height - ((point.neutronDensity - minValue) / rangeValue).toFloat() * size.height
            if (index == 0) {
                path.moveTo(x, y)
            } else {
                path.lineTo(x, y)
            }
        }

        drawPath(
            path = path,
            color = lineColor,
            style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
        )
    }
}
