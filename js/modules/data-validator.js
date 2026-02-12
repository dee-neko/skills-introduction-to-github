// データバリデーション

export class DataValidator {
    constructor() {
        this.requiredColumns = [
            '課目名',
            '講師名',
            '所属',
            '講義日時',
            '講義場所',
            '担当者名',
            '担当者メール'
        ];

        this.emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    }

    /**
     * CSVデータ全体のバリデーション
     * @param {Array} data
     * @returns {Object} { valid: boolean, errors: Array }
     */
    validateData(data) {
        const errors = [];

        if (!data || data.length === 0) {
            return { valid: false, errors: ['データが空です'] };
        }

        // カラム存在チェック
        const firstRow = data[0];
        const missingColumns = this.requiredColumns.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
            errors.push(`必須カラムが不足しています: ${missingColumns.join(', ')}`);
            return { valid: false, errors };
        }

        // 各行のバリデーション
        data.forEach((row, index) => {
            const rowErrors = this.validateRow(row, index + 1);
            errors.push(...rowErrors);
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 行ごとのバリデーション
     * @param {Object} row
     * @param {number} rowNumber
     * @returns {Array} errors
     */
    validateRow(row, rowNumber = null) {
        const errors = [];
        const prefix = rowNumber ? `行${rowNumber}: ` : '';

        // 必須カラムの値チェック
        this.requiredColumns.forEach(col => {
            if (!row[col] || String(row[col]).trim() === '') {
                errors.push(`${prefix}${col}が空です`);
            }
        });

        // メールアドレスのフォーマットチェック
        if (row['担当者メール'] && !this.emailPattern.test(row['担当者メール'])) {
            errors.push(`${prefix}担当者メールの形式が正しくありません`);
        }

        // 文字数制限チェック
        if (row['課目名'] && row['課目名'].length > 100) {
            errors.push(`${prefix}課目名が長すぎます（最大100文字）`);
        }

        if (row['講師名'] && row['講師名'].length > 50) {
            errors.push(`${prefix}講師名が長すぎます（最大50文字）`);
        }

        if (row['備考'] && row['備考'].length > 500) {
            errors.push(`${prefix}備考が長すぎます（最大500文字）`);
        }

        return errors;
    }

    /**
     * CSVインジェクション対策
     * @param {string} value
     * @returns {string}
     */
    sanitizeCSVCell(value) {
        if (typeof value === 'string' && /^[=+\-@]/.test(value)) {
            return "'" + value;
        }
        return value;
    }
}
