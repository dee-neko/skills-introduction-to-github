// ========================================
// グローバル変数
// ========================================
let questions = [];
let userAnswers = {};
let isGraded = false;
let currentMode = 'batch'; // 'batch' or 'instant'

// ========================================
// アプリケーション初期化
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestions();
    initializeEventListeners();
    renderQuestions();
});

// ========================================
// 問題データの読み込み
// ========================================
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        questions = await response.json();
        console.log('問題データを読み込みました:', questions.length + '問');
    } catch (error) {
        console.error('問題データの読み込みに失敗しました:', error);
        alert('問題データの読み込みに失敗しました。questions.jsonファイルを確認してください。');
    }
}

// ========================================
// イベントリスナーの初期化
// ========================================
function initializeEventListeners() {
    // 採点モード切り替え
    document.querySelectorAll('input[name="gradingMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentMode = e.target.value;
            handleModeChange();
        });
    });

    // 採点ボタン
    document.getElementById('gradeBtn').addEventListener('click', gradeAll);

    // リセットボタン
    document.getElementById('resetBtn').addEventListener('click', resetQuiz);
}

// ========================================
// モード変更処理
// ========================================
function handleModeChange() {
    const gradeBtn = document.getElementById('gradeBtn');

    if (currentMode === 'instant') {
        gradeBtn.style.display = 'none';
        // 即時判定モードでは既に回答済みの問題を判定
        Object.keys(userAnswers).forEach(questionId => {
            showInstantFeedback(parseInt(questionId));
        });
    } else {
        gradeBtn.style.display = 'inline-block';
        // 一括採点モードでは即時フィードバックを削除
        document.querySelectorAll('.instant-feedback').forEach(el => el.remove());
        if (!isGraded) {
            // まだ採点していない場合は、選択肢の色をリセット
            document.querySelectorAll('.choice-item').forEach(item => {
                item.classList.remove('correct-answer', 'wrong-answer');
            });
        }
    }
}

// ========================================
// 問題の描画
// ========================================
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    questions.forEach((question, index) => {
        const questionCard = createQuestionCard(question, index);
        container.appendChild(questionCard);
    });

    // MathJaxで数式をレンダリング
    if (window.MathJax) {
        MathJax.typesetPromise();
    }

    // 進捗バーの初期化
    updateProgress();
}

// ========================================
// 問題カードの作成
// ========================================
function createQuestionCard(question, index) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.id = `question-${question.id}`;

    let html = `
        <div class="question-header">
            <div class="question-number">問 ${question.id}</div>
            <div class="question-text">${question.question}</div>
        </div>
    `;

    // 画像がある場合
    if (question.hasImage && question.imagePath) {
        html += `
            <div class="question-image">
                <img src="${question.imagePath}" alt="${question.imageAlt || '問題画像'}"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <p style="display:none; color:#999; font-style:italic;">
                    ※画像ファイルが見つかりません (${question.imagePath})
                </p>
            </div>
        `;
    }

    // 選択肢
    html += '<div class="choices">';
    question.choices.forEach((choice, choiceIndex) => {
        html += `
            <div class="choice-item" data-question-id="${question.id}" data-choice-index="${choiceIndex}">
                <input type="radio"
                       name="question_${question.id}"
                       id="q${question.id}_choice${choiceIndex}"
                       value="${choiceIndex}">
                <label class="choice-label" for="q${question.id}_choice${choiceIndex}">
                    ${choiceIndex + 1}. ${choice}
                </label>
            </div>
        `;
    });
    html += '</div>';

    card.innerHTML = html;

    // 選択肢のクリックイベント
    card.querySelectorAll('.choice-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // ラジオボタン以外がクリックされた場合、ラジオボタンを選択
            if (e.target.tagName !== 'INPUT') {
                const radio = this.querySelector('input[type="radio"]');
                radio.checked = true;
            }

            const questionId = parseInt(this.dataset.questionId);
            const choiceIndex = parseInt(this.dataset.choiceIndex);

            handleAnswerSelection(questionId, choiceIndex);
        });
    });

    return card;
}

// ========================================
// 回答選択処理
// ========================================
function handleAnswerSelection(questionId, choiceIndex) {
    userAnswers[questionId] = choiceIndex;

    // 選択肢のハイライト
    const card = document.getElementById(`question-${questionId}`);
    card.querySelectorAll('.choice-item').forEach(item => {
        item.classList.remove('selected');
    });
    card.querySelector(`[data-choice-index="${choiceIndex}"]`).classList.add('selected');

    // 即時判定モードの場合
    if (currentMode === 'instant') {
        showInstantFeedback(questionId);
    }

    updateProgress();
}

// ========================================
// 即時フィードバック表示
// ========================================
function showInstantFeedback(questionId) {
    const question = questions.find(q => q.id === questionId);
    const userAnswer = userAnswers[questionId];
    const isCorrect = userAnswer === question.correctAnswer;

    const card = document.getElementById(`question-${questionId}`);
    const choiceItem = card.querySelector(`[data-choice-index="${userAnswer}"]`);

    // 既存のフィードバックを削除
    const existingFeedback = choiceItem.querySelector('.instant-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }

    // フィードバック要素を作成
    const feedback = document.createElement('div');
    feedback.className = `instant-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = isCorrect
        ? '✓ 正解です！'
        : `✗ 不正解です。正解は ${question.correctAnswer + 1} です。`;

    choiceItem.appendChild(feedback);

    // 選択肢に色を付ける
    card.querySelectorAll('.choice-item').forEach((item, idx) => {
        item.classList.remove('correct-answer', 'wrong-answer');
        if (idx === question.correctAnswer) {
            item.classList.add('correct-answer');
        } else if (idx === userAnswer && !isCorrect) {
            item.classList.add('wrong-answer');
        }
    });

    // MathJaxで数式を再レンダリング
    if (window.MathJax) {
        MathJax.typesetPromise([feedback]);
    }
}

// ========================================
// 進捗バーの更新
// ========================================
function updateProgress() {
    const answeredCount = Object.keys(userAnswers).length;
    const totalCount = questions.length;
    const percentage = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

    document.getElementById('answeredCount').textContent = answeredCount;
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('progressFill').style.width = `${percentage}%`;

    // 進捗バーを表示
    document.getElementById('progressBar').style.display = 'block';
}

// ========================================
// 一括採点
// ========================================
function gradeAll() {
    if (Object.keys(userAnswers).length === 0) {
        alert('少なくとも1問は回答してください。');
        return;
    }

    isGraded = true;

    // スコア計算
    let correctCount = 0;
    questions.forEach(question => {
        const userAnswer = userAnswers[question.id];
        if (userAnswer === question.correctAnswer) {
            correctCount++;
        }

        // 問題カードに正誤を表示
        const card = document.getElementById(`question-${question.id}`);

        if (userAnswer !== undefined) {
            const isCorrect = userAnswer === question.correctAnswer;
            card.classList.add(isCorrect ? 'correct' : 'incorrect');

            // 選択肢に色を付ける
            card.querySelectorAll('.choice-item').forEach((item, idx) => {
                if (idx === question.correctAnswer) {
                    item.classList.add('correct-answer');
                } else if (idx === userAnswer && !isCorrect) {
                    item.classList.add('wrong-answer');
                }
            });
        }

        // 解説を表示
        showExplanation(question);
    });

    // スコア表示
    displayScore(correctCount);

    // 採点ボタンを無効化
    document.getElementById('gradeBtn').disabled = true;

    // スコア表示位置までスクロール
    document.getElementById('scoreDisplay').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ========================================
// スコア表示
// ========================================
function displayScore(correctCount) {
    const totalQuestions = questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    document.getElementById('scoreValue').textContent = correctCount;
    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('scorePercentage').textContent = percentage;
    document.getElementById('scoreDisplay').style.display = 'block';

    // MathJaxで数式を再レンダリング
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

// ========================================
// 解説表示
// ========================================
function showExplanation(question) {
    const card = document.getElementById(`question-${question.id}`);

    // 既存の解説を削除
    const existingExplanation = card.querySelector('.explanation');
    if (existingExplanation) {
        existingExplanation.remove();
    }

    // 解説要素を作成
    const explanation = document.createElement('div');
    explanation.className = 'explanation';

    let html = '<h3>📚 解説</h3>';

    // 基本解説
    if (question.explanation) {
        html += `<p>${question.explanation}</p>`;
    }

    // 詳細解説
    if (question.detailedExplanation) {
        // 計算過程
        if (question.detailedExplanation.calculation) {
            html += `
                <div class="explanation-section">
                    <h4>💡 解法：</h4>
                    <p>${question.detailedExplanation.calculation.replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }

        // 各選択肢の解説
        if (question.detailedExplanation.choiceExplanations) {
            html += `
                <div class="explanation-section">
                    <h4>🔍 各選択肢の解説：</h4>
            `;
            question.detailedExplanation.choiceExplanations.forEach((exp, idx) => {
                const isCorrect = idx === question.correctAnswer;
                html += `
                    <div class="choice-explanation ${isCorrect ? 'correct-choice' : ''}">
                        <strong>${idx + 1}.</strong> ${exp}
                    </div>
                `;
            });
            html += '</div>';
        }
    }

    explanation.innerHTML = html;
    card.appendChild(explanation);

    // MathJaxで数式を再レンダリング
    if (window.MathJax) {
        MathJax.typesetPromise([explanation]);
    }
}

// ========================================
// リセット
// ========================================
function resetQuiz() {
    if (!confirm('回答をリセットしてもよろしいですか？')) {
        return;
    }

    // 状態をリセット
    userAnswers = {};
    isGraded = false;

    // UIをリセット
    document.getElementById('scoreDisplay').style.display = 'none';
    document.getElementById('gradeBtn').disabled = false;

    // 問題カードをリセット
    document.querySelectorAll('.question-card').forEach(card => {
        card.classList.remove('correct', 'incorrect');
        card.querySelectorAll('.choice-item').forEach(item => {
            item.classList.remove('selected', 'correct-answer', 'wrong-answer');
        });
        card.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = false;
        });

        // 解説と即時フィードバックを削除
        const explanation = card.querySelector('.explanation');
        if (explanation) explanation.remove();

        card.querySelectorAll('.instant-feedback').forEach(fb => fb.remove());
    });

    // 進捗バーをリセット
    updateProgress();

    // ページトップへスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
