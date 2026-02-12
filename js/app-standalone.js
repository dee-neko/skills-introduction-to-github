// 講義依頼文書生成ツール - スタンドアロン版
// このファイルはブラウザから直接HTMLファイルを開いて実行できるようにすべてのモジュールを統合したものです

// ============================================
// ユーティリティ: ヘルパー関数
// ============================================

/**
 * HTMLエスケープ
 * @param {string} text
 * @returns {string}
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * ファイル名のサニタイズ
 * @param {string} name
 * @returns {string}
 */
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9ぁ-んァ-ヶー一-龠]/g, '_');
}

/**
 * アラート表示
 * @param {HTMLElement} element
 * @param {string} message
 * @param {string} type - 'error', 'warning', 'success'
 */
function showAlert(element, message, type = 'error') {
    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
}

/**
 * アラート非表示
 * @param {HTMLElement} element
 */
function hideAlert(element) {
    element.style.display = 'none';
}

/**
 * セクション表示
 * @param {string} stepId
 */
function showStep(stepId) {
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
function hideStep(stepId) {
    const step = document.getElementById(stepId);
    if (step) {
        step.style.display = 'none';
    }
}

// ============================================
// ユーティリティ: 日付フォーマット
// ============================================

/**
 * 日付文字列をフォーマット
 * @param {string} dateString
 * @returns {string}
 */
function formatDate(dateString) {
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
function getRFC2822Date() {
    return new Date().toUTCString();
}

// ============================================
// モジュール: データバリデーション
// ============================================

class DataValidator {
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

// ============================================
// モジュール: CSV読み込み・解析
// ============================================

class CSVHandler {
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
            .map(col => `<th>${escapeHTML(col)}</th>`)
            .join('');

        // ボディ行の生成
        const bodyHTML = data
            .map(row => {
                const cells = columns
                    .map(col => `<td>${escapeHTML(String(row[col] || ''))}</td>`)
                    .join('');
                return `<tr>${cells}</tr>`;
            })
            .join('');

        return { headerHTML, bodyHTML };
    }
}

// ============================================
// モジュール: テンプレート管理
// ============================================

class TemplateManager {
    constructor() {
        this.defaultTemplate = '';
        this.currentTemplate = '';
    }

    /**
     * デフォルトテンプレートを読み込む
     * @returns {Promise<string>}
     */
    async loadDefaultTemplate() {
        // スタンドアロン版では常に埋め込みテンプレートを使用
        this.defaultTemplate = this.getEmbeddedTemplate();
        this.currentTemplate = this.defaultTemplate;
        return this.defaultTemplate;
    }

    /**
     * 埋め込みデフォルトテンプレート
     * @returns {string}
     */
    getEmbeddedTemplate() {
        return `{{講師名}} 様

お世話になっております。
{{担当者名}}と申します。

このたび、{{課目名}}の講義をお願いしたく、ご連絡を差し上げました。

【講義詳細】
・課目名: {{課目名}}
・日時: {{講義日時}}
・場所: {{講義場所}}
・所属: {{所属}}

{{#if 備考}}
【備考】
{{備考}}
{{/if}}

ご多忙のところ恐縮ですが、ご検討のほどよろしくお願い申し上げます。

{{担当者名}}
{{担当者メール}}`;
    }

    /**
     * テンプレートをコンパイル
     * @param {string} templateString
     * @returns {Function}
     */
    compileTemplate(templateString) {
        try {
            this.registerHelpers();
            const compiled = Handlebars.compile(templateString);

            // テストコンパイル
            const testData = {
                '課目名': 'テスト課目',
                '講師名': 'テスト講師',
                '所属': 'テスト所属',
                '講義日時': '2026年1月1日',
                '講義場所': 'テスト場所',
                '担当者名': 'テスト担当者',
                '担当者メール': 'test@example.com',
                '備考': ''
            };
            compiled(testData);

            this.currentTemplate = templateString;
            return compiled;
        } catch (error) {
            throw new Error(`テンプレートコンパイルエラー: ${error.message}`);
        }
    }

    /**
     * カスタムヘルパーの登録
     */
    registerHelpers() {
        // 日付フォーマットヘルパー
        Handlebars.registerHelper('formatDate', function(dateString) {
            if (!dateString) return '';

            // すでに日本語形式の場合はそのまま返す
            if (/\d{4}年\d{1,2}月\d{1,2}日/.test(dateString)) {
                return dateString;
            }

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
        });

        // 等価比較ヘルパー
        Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        });
    }

    /**
     * テンプレートのバリデーション
     * @param {string} templateString
     * @returns {Object} { valid: boolean, error: string }
     */
    validateTemplate(templateString) {
        try {
            this.compileTemplate(templateString);
            return { valid: true, error: null };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * 現在のテンプレートを取得
     * @returns {string}
     */
    getCurrentTemplate() {
        return this.currentTemplate;
    }

    /**
     * デフォルトテンプレートを取得
     * @returns {string}
     */
    getDefaultTemplate() {
        return this.defaultTemplate;
    }

    /**
     * テンプレートをリセット
     */
    resetToDefault() {
        this.currentTemplate = this.defaultTemplate;
        return this.currentTemplate;
    }
}

// ============================================
// モジュール: 文書生成
// ============================================

class DocumentGenerator {
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
        const escapedContent = escapeHTML(document.content);

        return `
            <div class="preview-item" data-index="${document.id}">
                <div class="preview-header" onclick="window.togglePreview(${document.id})">
                    <h4>${document.id + 1}. ${escapeHTML(document.lecturer)} 様 - ${escapeHTML(document.subject)}</h4>
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
                    ${document.id + 1}. ${escapeHTML(doc.lecturer)} 様 - ${escapeHTML(doc.subject)}
                </span>
                <button class="btn btn-secondary" onclick="window.downloadSingle(${doc.id})">
                    ダウンロード
                </button>
            </div>
        `).join('');
    }
}

// ============================================
// モジュール: メール下書き出力
// ============================================

class EmailExporter {
    /**
     * .eml形式で出力
     * @param {Object} document
     */
    exportAsEML(document) {
        const subject = this.generateSubject(document.data);
        const body = document.content;
        const to = document.data['担当者メール'] || '';

        const emlContent = this.buildEMLContent(subject, body, to);
        const filename = this.generateFileName(document, 'eml');

        this.downloadFile(emlContent, filename, 'message/rfc822');
    }

    /**
     * .txt形式で出力
     * @param {Object} document
     */
    exportAsText(document) {
        const content = document.content;
        const filename = this.generateFileName(document, 'txt');

        this.downloadFile(content, filename, 'text/plain');
    }

    /**
     * EMLコンテンツの構築
     * @param {string} subject
     * @param {string} body
     * @param {string} to
     * @returns {string}
     */
    buildEMLContent(subject, body, to) {
        const date = getRFC2822Date();

        return `Subject: ${subject}
To: ${to}
Date: ${date}
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit

${body}`;
    }

    /**
     * メール件名の生成
     * @param {Object} data
     * @returns {string}
     */
    generateSubject(data) {
        const subject = data['課目名'] || '講義';
        const dateTime = data['講義日時'] || '';
        return `【講義依頼】${subject} - ${dateTime}`;
    }

    /**
     * ファイル名の生成
     * @param {Object} document
     * @param {string} format - 'eml' または 'txt'
     * @returns {string}
     */
    generateFileName(document, format = 'eml') {
        const sanitized = sanitizeFileName(document.lecturer);
        const index = document.id + 1;
        return `lecture_request_${sanitized}_${index}.${format}`;
    }

    /**
     * 一括エクスポート
     * @param {Array} documents
     * @param {string} format - 'eml' または 'txt'
     */
    exportBatch(documents, format = 'eml') {
        documents.forEach(doc => {
            if (format === 'eml') {
                this.exportAsEML(doc);
            } else {
                this.exportAsText(doc);
            }

            // ダウンロード間隔を少し空ける（ブラウザの制限対策）
            return new Promise(resolve => setTimeout(resolve, 100));
        });
    }

    /**
     * ファイルダウンロード
     * @param {string} content
     * @param {string} filename
     * @param {string} mimeType
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        saveAs(blob, filename);
    }
}

// ============================================
// メインアプリケーション
// ============================================

class LectureRequestApp {
    constructor() {
        this.csvData = null;
        this.compiledTemplate = null;
        this.generatedDocuments = [];

        // モジュールの初期化
        this.csvHandler = new CSVHandler();
        this.templateManager = new TemplateManager();
        this.documentGenerator = null;
        this.emailExporter = new EmailExporter();

        // DOMエレメント
        this.elements = {};
    }

    async init() {
        // DOMエレメント参照の取得
        this.getDOMReferences();

        // デフォルトテンプレートの読み込み
        try {
            const template = await this.templateManager.loadDefaultTemplate();
            this.elements.templateInput.value = template;
        } catch (error) {
            console.error('テンプレート読み込みエラー:', error);
        }

        // イベントリスナーの設定
        this.setupEventListeners();

        console.log('アプリケーション初期化完了');
    }

    getDOMReferences() {
        this.elements = {
            // Step 1
            dropZone: document.getElementById('dropZone'),
            fileInput: document.getElementById('fileInput'),
            fileSelectBtn: document.getElementById('fileSelectBtn'),
            uploadError: document.getElementById('uploadError'),

            // Step 2
            dataTable: document.getElementById('dataTable'),
            tableHeader: document.getElementById('tableHeader'),
            tableBody: document.getElementById('tableBody'),
            validationErrors: document.getElementById('validationErrors'),
            proceedToTemplateBtn: document.getElementById('proceedToTemplateBtn'),

            // Step 3
            templateInput: document.getElementById('templateInput'),
            resetTemplateBtn: document.getElementById('resetTemplateBtn'),
            templateError: document.getElementById('templateError'),
            generateDocumentsBtn: document.getElementById('generateDocumentsBtn'),

            // Step 4
            previewContainer: document.getElementById('previewContainer'),
            proceedToExportBtn: document.getElementById('proceedToExportBtn'),

            // Step 5
            downloadAllBtn: document.getElementById('downloadAllBtn'),
            exportList: document.getElementById('exportList')
        };
    }

    setupEventListeners() {
        // Step 1: ファイルアップロード
        this.elements.fileSelectBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        this.elements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
        });

        // ドラッグ&ドロップ
        this.elements.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.dropZone.classList.add('drag-over');
        });

        this.elements.dropZone.addEventListener('dragleave', () => {
            this.elements.dropZone.classList.remove('drag-over');
        });

        this.elements.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.dropZone.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
        });

        // Step 2: 次へボタン
        this.elements.proceedToTemplateBtn.addEventListener('click', () => {
            showStep('step3');
        });

        // Step 3: テンプレートリセット
        this.elements.resetTemplateBtn.addEventListener('click', () => {
            this.elements.templateInput.value = this.templateManager.getDefaultTemplate();
            hideAlert(this.elements.templateError);
        });

        // Step 3: 文書生成
        this.elements.generateDocumentsBtn.addEventListener('click', () => {
            this.generateDocuments();
        });

        // Step 4: エクスポートへ
        this.elements.proceedToExportBtn.addEventListener('click', () => {
            this.prepareExportStep();
            showStep('step5');
        });

        // Step 5: すべてダウンロード
        this.elements.downloadAllBtn.addEventListener('click', () => {
            this.downloadAll();
        });

        // グローバル関数の設定（プレビュー・ダウンロード用）
        window.togglePreview = (index) => this.togglePreview(index);
        window.downloadSingle = (index) => this.downloadSingle(index);
    }

    async handleFileUpload(file) {
        hideAlert(this.elements.uploadError);

        try {
            const result = await this.csvHandler.parseFile(file);
            this.csvData = result.data;

            // バリデーション結果の表示
            if (!result.validation.valid) {
                const errorMessages = result.validation.errors.join('\n');
                showAlert(this.elements.validationErrors, errorMessages, 'warning');
            } else {
                hideAlert(this.elements.validationErrors);
            }

            // テーブルに表示
            this.displayDataTable(this.csvData);

            // Step 2を表示
            showStep('step2');

        } catch (error) {
            showAlert(this.elements.uploadError, error.message, 'error');
            console.error('ファイルアップロードエラー:', error);
        }
    }

    displayDataTable(data) {
        const { headerHTML, bodyHTML } = this.csvHandler.convertToTableHTML(data);

        this.elements.tableHeader.innerHTML = headerHTML;
        this.elements.tableBody.innerHTML = bodyHTML;
    }

    generateDocuments() {
        hideAlert(this.elements.templateError);

        try {
            // テンプレートのコンパイル
            const templateString = this.elements.templateInput.value;
            const validation = this.templateManager.validateTemplate(templateString);

            if (!validation.valid) {
                showAlert(this.elements.templateError, validation.error, 'error');
                return;
            }

            this.compiledTemplate = this.templateManager.compileTemplate(templateString);

            // 文書生成
            this.documentGenerator = new DocumentGenerator(this.compiledTemplate);
            this.generatedDocuments = this.documentGenerator.generateAll(this.csvData);

            // プレビュー表示
            this.displayPreview(this.generatedDocuments);

            // Step 4を表示
            showStep('step4');

        } catch (error) {
            showAlert(this.elements.templateError, `文書生成エラー: ${error.message}`, 'error');
            console.error('文書生成エラー:', error);
        }
    }

    displayPreview(documents) {
        const previewHTML = this.documentGenerator.generatePreviewHTML(documents);
        this.elements.previewContainer.innerHTML = previewHTML;

        // 最初のアイテムを展開
        if (documents.length > 0) {
            const firstItem = this.elements.previewContainer.querySelector('.preview-item');
            if (firstItem) {
                firstItem.classList.add('expanded');
            }
        }
    }

    togglePreview(index) {
        const item = this.elements.previewContainer.querySelector(`[data-index="${index}"]`);
        if (item) {
            item.classList.toggle('expanded');
        }
    }

    prepareExportStep() {
        const exportListHTML = this.generatedDocuments.map(doc => `
            <div class="export-item">
                <span class="export-item-info">
                    ${doc.id + 1}. ${escapeHTML(doc.lecturer)} 様 - ${escapeHTML(doc.subject)}
                </span>
                <button class="btn btn-secondary" onclick="window.downloadSingle(${doc.id})">
                    ダウンロード
                </button>
            </div>
        `).join('');

        this.elements.exportList.innerHTML = exportListHTML;
    }

    downloadAll() {
        const format = document.querySelector('input[name="exportFormat"]:checked').value;
        this.emailExporter.exportBatch(this.generatedDocuments, format);
    }

    downloadSingle(index) {
        const format = document.querySelector('input[name="exportFormat"]:checked').value;
        const document = this.generatedDocuments[index];

        if (!document) {
            console.error('文書が見つかりません:', index);
            return;
        }

        if (format === 'eml') {
            this.emailExporter.exportAsEML(document);
        } else {
            this.emailExporter.exportAsText(document);
        }
    }
}

// ============================================
// アプリケーション起動
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new LectureRequestApp();
    app.init();
});
