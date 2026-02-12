// テンプレート管理

export class TemplateManager {
    constructor() {
        this.defaultTemplate = '';
        this.currentTemplate = '';
    }

    /**
     * デフォルトテンプレートを読み込む
     * @returns {Promise<string>}
     */
    async loadDefaultTemplate() {
        try {
            const response = await fetch('templates/default-template.hbs');
            if (!response.ok) {
                throw new Error('テンプレートファイルの読み込みに失敗しました');
            }
            this.defaultTemplate = await response.text();
            this.currentTemplate = this.defaultTemplate;
            return this.defaultTemplate;
        } catch (error) {
            console.warn('外部テンプレート読み込みエラー、埋め込みテンプレートを使用します', error);
            // フォールバック: 埋め込みデフォルトテンプレート
            this.defaultTemplate = this.getEmbeddedTemplate();
            this.currentTemplate = this.defaultTemplate;
            return this.defaultTemplate;
        }
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
