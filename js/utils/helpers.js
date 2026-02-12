// 共通ヘルパー関数

/**
 * HTMLエスケープ
 * @param {string} text
 * @returns {string}
 */
export function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * ファイル名のサニタイズ
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9ぁ-んァ-ヶー一-龠]/g, '_');
}

/**
 * アラート表示
 * @param {HTMLElement} element
 * @param {string} message
 * @param {string} type - 'error', 'warning', 'success'
 */
export function showAlert(element, message, type = 'error') {
    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
}

/**
 * アラート非表示
 * @param {HTMLElement} element
 */
export function hideAlert(element) {
    element.style.display = 'none';
}

/**
 * セクション表示
 * @param {string} stepId
 */
export function showStep(stepId) {
    const step = document.getElementById(stepId);
    if (step) {
        step.style.display = 'block';
        step.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * セクション非表示
 * @param {string} stepId
 */
export function hideStep(stepId) {
    const step = document.getElementById(stepId);
    if (step) {
        step.style.display = 'none';
    }
}
