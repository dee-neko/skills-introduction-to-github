// 日付フォーマット処理

/**
 * 日付文字列をフォーマット
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
    // すでに日本語形式の場合はそのまま返す
    if (/\d{4}年\d{1,2}月\d{1,2}日/.test(dateString)) {
        return dateString;
    }

    // ISO形式やその他の形式を日本語形式に変換
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        return `${year}年${month}月${day}日`;
    } catch (error) {
        return dateString;
    }
}

/**
 * RFC 2822形式の日付を生成
 * @returns {string}
 */
export function getRFC2822Date() {
    return new Date().toUTCString();
}
