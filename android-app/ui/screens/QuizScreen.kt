package ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

data class QuizOption(val label: String, val isCorrect: Boolean)

data class QuizQuestion(val prompt: String, val options: List<QuizOption>)

private val sampleQuestions = listOf(
    QuizQuestion(
        prompt = "一点炉方程式に含まれるフィードバックで遅発中性子に関係する項はどれですか？",
        options = listOf(
            QuizOption("(β/Λ) n", true),
            QuizOption("((ρ-β)/Λ) n", false),
            QuizOption("λ C", false)
        )
    ),
    QuizQuestion(
        prompt = "反応度 ρ を大きく正にすると最も影響を受けるのは？",
        options = listOf(
            QuizOption("即発中性子による立ち上がり速度", true),
            QuizOption("遅発中性子割合 β の値", false),
            QuizOption("崩壊定数 λ", false)
        )
    )
)

@Composable
fun QuizScreen() {
    val currentIndex = remember { mutableStateOf(0) }
    val selected = remember { mutableStateOf<QuizOption?>(null) }
    val result = remember { mutableStateOf<String?>(null) }

    val question = sampleQuestions[currentIndex.value]

    Column(modifier = Modifier.padding(16.dp)) {
        Text(text = question.prompt, modifier = Modifier.padding(bottom = 12.dp))

        question.options.forEach { option ->
            Column(modifier = Modifier.padding(bottom = 8.dp)) {
                RadioButton(
                    selected = selected.value == option,
                    onClick = { selected.value = option }
                )
                Text(text = option.label)
            }
        }

        Button(onClick = {
            selected.value?.let {
                result.value = if (it.isCorrect) "正解！" else "もう一度考えてみましょう"
            }
        }, modifier = Modifier.padding(top = 8.dp)) {
            Text(text = "回答する")
        }

        Button(onClick = {
            selected.value = null
            result.value = null
            currentIndex.value = (currentIndex.value + 1) % sampleQuestions.size
        }, modifier = Modifier.padding(top = 8.dp)) {
            Text(text = "次の問題へ")
        }

        result.value?.let { feedback ->
            Text(text = feedback, modifier = Modifier.padding(top = 12.dp))
        }
    }
}
