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

    // JSON読み込みボタン（問題作成者用）
    document.getElementById('loadJsonBtn').addEventListener('click', () => {
        document.getElementById('jsonFileInput').click();
    });
    document.getElementById('jsonFileInput').addEventListener('change', handleJsonFileLoad);

    // 回答の保存・読み込みボタン
    document.getElementById('saveAnswersBtn').addEventListener('click', saveAnswersToLocalStorage);
    document.getElementById('loadAnswersBtn').addEventListener('click', loadAnswersFromLocalStorage);
    document.getElementById('exportAnswersBtn').addEventListener('click', exportAnswersToFile);
    document.getElementById('importAnswersBtn').addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput').addEventListener('change', handleImportAnswers);

    // 採点結果保存ボタン
    document.getElementById('saveResultBtn').addEventListener('click', saveResultToHTML);
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

// ========================================
// JSON読み込み機能（問題作成者用）
// ========================================
async function handleJsonFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('jsonLoadStatus');

    try {
        const text = await file.text();
        const newQuestions = JSON.parse(text);

        // 簡単なバリデーション
        if (!Array.isArray(newQuestions)) {
            throw new Error('JSONファイルは配列形式である必要があります。');
        }

        if (newQuestions.length === 0) {
            throw new Error('問題データが空です。');
        }

        // 必須項目のチェック
        for (let i = 0; i < newQuestions.length; i++) {
            const q = newQuestions[i];
            if (!q.id || !q.question || !q.choices || q.correctAnswer === undefined) {
                throw new Error(`問題${i + 1}: 必須項目（id, question, choices, correctAnswer）が不足しています。`);
            }
        }

        // 問題データを更新
        questions = newQuestions;

        // UIをリセットして再描画
        userAnswers = {};
        isGraded = false;
        renderQuestions();

        showStatus(statusDiv, 'success', `✓ ${newQuestions.length}問の問題データを読み込みました！`);

        // ファイル入力をリセット
        event.target.value = '';

    } catch (error) {
        console.error('JSON読み込みエラー:', error);
        showStatus(statusDiv, 'error', `✗ エラー: ${error.message}`);
    }
}

// ========================================
// 回答の保存・読み込み（localStorage）
// ========================================
function saveAnswersToLocalStorage() {
    const statusDiv = document.getElementById('saveLoadStatus');

    if (Object.keys(userAnswers).length === 0) {
        showStatus(statusDiv, 'info', 'ℹ 回答がありません。先に問題を解いてください。');
        return;
    }

    const saveData = {
        timestamp: new Date().toISOString(),
        questionsCount: questions.length,
        answers: userAnswers,
        isGraded: isGraded
    };

    try {
        localStorage.setItem('examAnswers', JSON.stringify(saveData));
        showStatus(statusDiv, 'success', `✓ 回答を保存しました（${Object.keys(userAnswers).length}問）`);
    } catch (error) {
        console.error('保存エラー:', error);
        showStatus(statusDiv, 'error', '✗ 保存に失敗しました。' + error.message);
    }
}

function loadAnswersFromLocalStorage() {
    const statusDiv = document.getElementById('saveLoadStatus');

    try {
        const saved = localStorage.getItem('examAnswers');
        if (!saved) {
            showStatus(statusDiv, 'info', 'ℹ 保存された回答がありません。');
            return;
        }

        const saveData = JSON.parse(saved);

        // 問題数が一致するかチェック
        if (saveData.questionsCount !== questions.length) {
            if (!confirm(`保存された回答は${saveData.questionsCount}問用ですが、現在の問題は${questions.length}問です。読み込みますか？`)) {
                return;
            }
        }

        // 回答を復元
        userAnswers = saveData.answers;
        isGraded = false; // 採点状態はリセット

        // UIを更新
        renderQuestions();
        restoreAnswersToUI();

        const savedDate = new Date(saveData.timestamp).toLocaleString('ja-JP');
        showStatus(statusDiv, 'success', `✓ 回答を読み込みました（保存日時: ${savedDate}）`);

    } catch (error) {
        console.error('読み込みエラー:', error);
        showStatus(statusDiv, 'error', '✗ 読み込みに失敗しました。' + error.message);
    }
}

function restoreAnswersToUI() {
    Object.keys(userAnswers).forEach(questionId => {
        const qId = parseInt(questionId);
        const choiceIndex = userAnswers[questionId];

        const radio = document.querySelector(`input[name="question_${qId}"][value="${choiceIndex}"]`);
        if (radio) {
            radio.checked = true;
            const choiceItem = radio.closest('.choice-item');
            if (choiceItem) {
                choiceItem.classList.add('selected');
            }
        }
    });

    updateProgress();
}

// ========================================
// 回答のエクスポート・インポート（JSON）
// ========================================
function exportAnswersToFile() {
    const statusDiv = document.getElementById('saveLoadStatus');

    if (Object.keys(userAnswers).length === 0) {
        showStatus(statusDiv, 'info', 'ℹ 回答がありません。先に問題を解いてください。');
        return;
    }

    const exportData = {
        exportDate: new Date().toISOString(),
        questionsCount: questions.length,
        answers: userAnswers,
        isGraded: isGraded
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 10);
    a.download = `exam-answers-${timestamp}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showStatus(statusDiv, 'success', '✓ 回答をエクスポートしました。');
}

async function handleImportAnswers(event) {
    const statusDiv = document.getElementById('saveLoadStatus');
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // データのバリデーション
        if (!importData.answers) {
            throw new Error('無効なファイル形式です。');
        }

        // 問題数の確認
        if (importData.questionsCount !== questions.length) {
            if (!confirm(`インポートするデータは${importData.questionsCount}問用ですが、現在の問題は${questions.length}問です。読み込みますか？`)) {
                event.target.value = '';
                return;
            }
        }

        // 回答を復元
        userAnswers = importData.answers;
        isGraded = false;

        // UIを更新
        renderQuestions();
        restoreAnswersToUI();

        showStatus(statusDiv, 'success', '✓ 回答をインポートしました。');

        // ファイル入力をリセット
        event.target.value = '';

    } catch (error) {
        console.error('インポートエラー:', error);
        showStatus(statusDiv, 'error', '✗ インポートに失敗しました。' + error.message);
        event.target.value = '';
    }
}

// ========================================
// 採点結果をHTMLとして保存
// ========================================
function saveResultToHTML() {
    if (!isGraded) {
        alert('先に採点を行ってください。');
        return;
    }

    // HTMLテンプレートを作成
    let html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>採点結果 - 放射線取扱主任者試験</title>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
    <script>
        MathJax = {
            tex: {
                inlineMath: [['$', '$']],
                displayMath: [['$$', '$$']]
            },
            svg: {
                fontCache: 'global'
            }
        };
    </script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        .score {
            font-size: 3rem;
            font-weight: 700;
        }
        .question-card {
            background: white;
            padding: 25px;
            margin-bottom: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .question-card.correct {
            border-left: 5px solid #28a745;
        }
        .question-card.incorrect {
            border-left: 5px solid #dc3545;
        }
        .question-number {
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            display: inline-block;
            margin-bottom: 15px;
            font-weight: 700;
        }
        .choice {
            padding: 12px;
            margin: 8px 0;
            border-radius: 6px;
            background: #f8f9fa;
        }
        .choice.user-answer {
            background: #fff3cd;
            border: 2px solid #ffc107;
        }
        .choice.correct-answer {
            background: #d4edda;
            border: 2px solid #28a745;
        }
        .choice.wrong-answer {
            background: #f8d7da;
            border: 2px solid #dc3545;
        }
        .explanation {
            margin-top: 20px;
            padding: 20px;
            background: #fff8e6;
            border-left: 5px solid #ffc107;
            border-radius: 8px;
        }
        .explanation h3 {
            color: #ff9800;
            margin-bottom: 10px;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        @media print {
            .print-button { display: none; }
            body { background: white; }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">🖨️ 印刷</button>

    <div class="header">
        <h1>🔬 放射線取扱主任者試験 採点結果</h1>
        <p>採点日時: ${new Date().toLocaleString('ja-JP')}</p>
        <div class="score">
            ${document.getElementById('scoreValue').textContent} / ${document.getElementById('totalQuestions').textContent}
        </div>
        <p>正答率: ${document.getElementById('scorePercentage').textContent}%</p>
    </div>
`;

    // 各問題を追加
    questions.forEach(question => {
        const userAnswer = userAnswers[question.id];
        const isCorrect = userAnswer === question.correctAnswer;
        const answered = userAnswer !== undefined;

        html += `
    <div class="question-card ${answered ? (isCorrect ? 'correct' : 'incorrect') : ''}">
        <div class="question-number">問 ${question.id}</div>
        <div class="question-text">${question.question}</div>

        <div class="choices">`;

        question.choices.forEach((choice, idx) => {
            let className = 'choice';
            let label = '';

            if (idx === question.correctAnswer) {
                className += ' correct-answer';
                label = ' ✓ 正解';
            }
            if (idx === userAnswer && !isCorrect) {
                className += ' wrong-answer';
                label = ' ✗ あなたの回答';
            } else if (idx === userAnswer && isCorrect) {
                label = ' ✓ あなたの回答';
            }

            html += `
            <div class="${className}">
                ${idx + 1}. ${choice}${label}
            </div>`;
        });

        html += `
        </div>`;

        // 解説を追加
        if (question.explanation || question.detailedExplanation) {
            html += `
        <div class="explanation">
            <h3>📚 解説</h3>
            ${question.explanation ? `<p>${question.explanation}</p>` : ''}
            ${question.detailedExplanation?.calculation ? `<p>${question.detailedExplanation.calculation.replace(/\n/g, '<br>')}</p>` : ''}
        </div>`;
        }

        html += `
    </div>`;
    });

    html += `
</body>
</html>`;

    // HTMLファイルとしてダウンロード
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 10);
    a.download = `exam-result-${timestamp}.html`;
    a.click();
    URL.revokeObjectURL(url);

    alert('採点結果をHTMLファイルとして保存しました。\nブラウザで開いて印刷やPDF化ができます。');
}

// ========================================
// ステータス表示ヘルパー関数
// ========================================
function showStatus(element, type, message) {
    element.className = `load-status ${type}`;
    element.textContent = message;
    element.style.display = 'block';

    // 3秒後に自動的に消す（成功メッセージの場合）
    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}
