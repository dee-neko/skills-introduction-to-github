// 文書生成

export class DocumentGenerator {
    constructor(compiledTemplate) {
        this.template = compiledTemplate;
    }

    /**
     * すべての文書を生成
     * @param {Array} csvData
     * @returns {Array}
     */
    generateAll(csvData) {
        return csvData.map((row, index) => ({
            id: index,
            lecturer: row['講師名'] || '',
            subject: row['課目名'] || '',
            content: this.template(row),
            data: row
        }));
    }

    /**
     * 単一の文書を生成
     * @param {Object} rowData
     * @param {number} id
     * @returns {Object}
     */
    generateSingle(rowData, id = 0) {
        return {
            id: id,
            lecturer: rowData['講師名'] || '',
            subject: rowData['課目名'] || '',
            content: this.template(rowData),
            data: rowData
        };
    }

    /**
     * プレビュー用HTMLを生成
     * @param {Array} documents
     * @returns {string}
     */
    generatePreviewHTML(documents) {
        return documents.map(doc => this.generatePreviewItem(doc)).join('');
    }

    /**
     * 個別プレビューアイテムのHTML生成
     * @param {Object} document
     * @returns {string}
     */
    generatePreviewItem(document) {
        const escapedContent = this.escapeHTML(document.content);

        return `
            <div class="preview-item" data-index="${document.id}">
                <div class="preview-header" onclick="window.togglePreview(${document.id})">
                    <h4>${document.id + 1}. ${this.escapeHTML(document.lecturer)} 様 - ${this.escapeHTML(document.subject)}</h4>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="preview-body">
                    <pre class="preview-content">${escapedContent}</pre>
                    <button class="btn btn-secondary" onclick="window.downloadSingle(${document.id})">
                        この文書をダウンロード
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * エクスポートリスト用HTMLを生成
     * @param {Array} documents
     * @returns {string}
     */
    generateExportListHTML(documents) {
        return documents.map(doc => `
            <div class="export-item">
                <span class="export-item-info">
                    ${document.id + 1}. ${this.escapeHTML(doc.lecturer)} 様 - ${this.escapeHTML(doc.subject)}
                </span>
                <button class="btn btn-secondary" onclick="window.downloadSingle(${doc.id})">
                    ダウンロード
                </button>
            </div>
        `).join('');
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
