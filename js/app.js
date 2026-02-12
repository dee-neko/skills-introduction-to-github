// メインアプリケーション

import { CSVHandler } from './modules/csv-handler.js';
import { TemplateManager } from './modules/template-manager.js';
import { DocumentGenerator } from './modules/document-generator.js';
import { EmailExporter } from './modules/email-exporter.js';
import { showAlert, hideAlert, showStep } from './utils/helpers.js';

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
                    ${doc.id + 1}. ${this.escapeHTML(doc.lecturer)} 様 - ${this.escapeHTML(doc.subject)}
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

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
    const app = new LectureRequestApp();
    app.init();
});
