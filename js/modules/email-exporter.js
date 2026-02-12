// メール下書き出力

import { sanitizeFileName } from '../utils/helpers.js';
import { getRFC2822Date } from '../utils/date-formatter.js';

export class EmailExporter {
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
