// CSV読み込み・解析

import { DataValidator } from './data-validator.js';

export class CSVHandler {
    constructor() {
        this.validator = new DataValidator();
    }

    /**
     * ファイルをパースしてCSVデータを返す
     * @param {File} file
     * @returns {Promise}
     */
    parseFile(file) {
        return new Promise((resolve, reject) => {
            // ファイルサイズチェック（5MB以内）
            const MAX_FILE_SIZE = 5 * 1024 * 1024;
            if (file.size > MAX_FILE_SIZE) {
                reject(new Error('ファイルサイズが大きすぎます（最大5MB）'));
                return;
            }

            // 拡張子チェック
            if (!file.name.endsWith('.csv')) {
                reject(new Error('CSVファイルを選択してください'));
                return;
            }

            // PapaParse でCSVをパース
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                encoding: 'UTF-8',
                complete: (results) => {
                    if (results.errors.length > 0) {
                        const errorMessages = results.errors
                            .map(err => `行${err.row}: ${err.message}`)
                            .join('\n');
                        reject(new Error(`CSV解析エラー:\n${errorMessages}`));
                        return;
                    }

                    try {
                        const normalized = this.normalizeData(results.data);
                        const validation = this.validator.validateData(normalized);

                        if (!validation.valid) {
                            // 警告として表示するが、データは返す
                            console.warn('バリデーション警告:', validation.errors);
                        }

                        resolve({
                            data: normalized,
                            validation: validation
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error) => {
                    reject(new Error(`ファイル読み込みエラー: ${error.message}`));
                }
            });
        });
    }

    /**
     * データの正規化
     * @param {Array} data
     * @returns {Array}
     */
    normalizeData(data) {
        return data.map(row => {
            const normalized = {};
            for (const [key, value] of Object.entries(row)) {
                // トリム処理
                const trimmedValue = typeof value === 'string' ? value.trim() : value;
                // CSVインジェクション対策
                normalized[key] = this.validator.sanitizeCSVCell(trimmedValue);
            }
            return normalized;
        });
    }

    /**
     * CSVデータをテーブルHTMLに変換
     * @param {Array} data
     * @returns {Object} { headerHTML, bodyHTML }
     */
    convertToTableHTML(data) {
        if (!data || data.length === 0) {
            return { headerHTML: '', bodyHTML: '' };
        }

        // ヘッダー行の生成
        const columns = Object.keys(data[0]);
        const headerHTML = columns
            .map(col => `<th>${this.escapeHTML(col)}</th>`)
            .join('');

        // ボディ行の生成
        const bodyHTML = data
            .map(row => {
                const cells = columns
                    .map(col => `<td>${this.escapeHTML(String(row[col] || ''))}</td>`)
                    .join('');
                return `<tr>${cells}</tr>`;
            })
            .join('');

        return { headerHTML, bodyHTML };
    }

    /**
     * HTMLエスケープ
     * @param {string} text
     * @returns {string}
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
