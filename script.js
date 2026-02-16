document.addEventListener('DOMContentLoaded', function () {
    // DOM references
    var form = document.getElementById('request-form');
    var preview = document.getElementById('document-preview');
    var copyBtn = document.getElementById('copy-btn');
    var printBtn = document.getElementById('print-btn');

    // Set default date to today
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('issue-date').value = yyyy + '-' + mm + '-' + dd;

    // Initial render
    updatePreview();

    // Event listeners
    form.addEventListener('input', updatePreview);
    copyBtn.addEventListener('click', copyToClipboard);
    printBtn.addEventListener('click', function () {
        window.print();
    });

    // ===== Utility Functions =====

    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function toFullWidth(num) {
        var fullWidthDigits = '０１２３４５６７８９';
        return String(num).replace(/[0-9]/g, function (c) {
            return fullWidthDigits[c];
        });
    }

    function formatJapaneseDate(dateString) {
        if (!dateString) return '';
        var parts = dateString.split('-');
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        var day = parseInt(parts[2], 10);

        // 令和: 2019-05-01 onwards, 平成: before that
        if (year > 2019 || (year === 2019 && month >= 5)) {
            var reiwaYear = year - 2018;
            return '令和' + reiwaYear + '年' + month + '月' + day + '日';
        } else {
            var heiseiYear = year - 1988;
            return '平成' + heiseiYear + '年' + month + '月' + day + '日';
        }
    }

    function replacePlaceholders(text, data) {
        if (!text) return '';
        return text
            .replace(/\{講師名\}/g, data.instructorName || '')
            .replace(/\{組織名\}/g, data.senderOrg || '')
            .replace(/\{敬称\}/g, data.honorific || '');
    }

    // ===== Data Collection =====

    function getFormData() {
        return {
            documentNumber: document.getElementById('doc-number').value.trim(),
            issueDate: document.getElementById('issue-date').value,
            instructorName: document.getElementById('instructor-name').value.trim(),
            instructorAffiliation: document.getElementById('instructor-affiliation').value.trim(),
            honorific: document.getElementById('honorific').value,
            trainingName: document.getElementById('training-name').value.trim(),
            subjectName: document.getElementById('subject-name').value.trim(),
            dateTime: document.getElementById('date-time').value.trim(),
            venue: document.getElementById('venue').value.trim(),
            senderOrg: document.getElementById('sender-org').value.trim(),
            senderPosition: document.getElementById('sender-position').value.trim(),
            senderName: document.getElementById('sender-name').value.trim(),
            templateSubject: document.getElementById('template-subject').value.trim(),
            templateGreeting: document.getElementById('template-greeting').value.trim(),
            templateBody: document.getElementById('template-body').value.trim(),
            honorarium: document.getElementById('honorarium').value.trim()
        };
    }

    // ===== Document Generation (HTML) =====

    function generateDocumentHTML(data) {
        var dateStr = formatJapaneseDate(data.issueDate);

        // Date
        var html = '<p class="doc-date">' + escapeHTML(dateStr) + '</p>';

        // Document number
        if (data.documentNumber) {
            html += '<p class="doc-number">' + escapeHTML(data.documentNumber) + '</p>';
        }

        // Recipient
        html += '<div class="doc-recipient">';
        html += '<p>' + (escapeHTML(data.instructorAffiliation) || '<span class="doc-placeholder">（講師の所属）</span>') + '</p>';
        html += '<p class="recipient-name">' +
            (escapeHTML(data.instructorName) || '<span class="doc-placeholder">（講師名）</span>') +
            '　' + escapeHTML(data.honorific) + '</p>';
        html += '</div>';

        // Sender
        html += '<div class="doc-sender">';
        html += '<p>' + (escapeHTML(data.senderOrg) || '<span class="doc-placeholder">（差出人組織名）</span>') + '</p>';
        if (data.senderPosition || data.senderName) {
            html += '<p>' + escapeHTML(data.senderPosition) + '　' + escapeHTML(data.senderName) + '</p>';
        }
        html += '</div>';

        // Subject
        var subject = replacePlaceholders(data.templateSubject, data);
        html += '<p class="doc-subject">' + escapeHTML(subject) + '</p>';

        // Body
        var greeting = replacePlaceholders(data.templateGreeting, data);
        var body = replacePlaceholders(data.templateBody, data);
        html += '<div class="doc-body">';
        html += '<p>' + escapeHTML(greeting) + '</p>';
        html += '<p>' + escapeHTML(body) + '</p>';
        html += '</div>';

        // Closing
        html += '<p class="doc-closing">敬具</p>';

        // Details header
        html += '<p class="doc-details-header">記</p>';

        // Details
        var details = [];
        details.push({ label: '研修名', value: data.trainingName });
        details.push({ label: '課目名', value: data.subjectName });
        details.push({ label: '日　時', value: data.dateTime });
        if (data.venue) {
            details.push({ label: '場　所', value: data.venue });
        }
        if (data.honorarium) {
            details.push({ label: '謝金等', value: data.honorarium });
        }

        html += '<div class="doc-details">';
        for (var i = 0; i < details.length; i++) {
            var num = toFullWidth(i + 1);
            html += '<div class="detail-row">' +
                '<span class="detail-num">' + num + '　</span>' +
                '<span class="detail-label">' + escapeHTML(details[i].label) + '　　</span>' +
                '<span class="detail-value">' + (escapeHTML(details[i].value) || '<span class="doc-placeholder">（未入力）</span>') + '</span>' +
                '</div>';
        }
        html += '</div>';

        // End
        html += '<p class="doc-end">以上</p>';

        return html;
    }

    // ===== Document Generation (Plain Text) =====

    function generatePlainText(data) {
        var dateStr = formatJapaneseDate(data.issueDate);
        var lines = [];

        // Date (right-aligned with spaces)
        lines.push('　　　　　　　　　　　　　　　　　　　　' + dateStr);

        // Document number
        if (data.documentNumber) {
            lines.push('　　　　　　　　　　　　　　　　　　　　' + data.documentNumber);
        }

        lines.push('');

        // Recipient
        lines.push((data.instructorAffiliation || '（講師の所属）'));
        lines.push('　' + (data.instructorName || '（講師名）') + '　' + data.honorific);

        lines.push('');

        // Sender (right-aligned)
        lines.push('　　　　　　　　　　　　' + (data.senderOrg || '（差出人組織名）'));
        if (data.senderPosition || data.senderName) {
            lines.push('　　　　　　　　　　　　' + (data.senderPosition || '') + '　' + (data.senderName || ''));
        }

        lines.push('');
        lines.push('');

        // Subject (centered)
        var subject = replacePlaceholders(data.templateSubject, data);
        lines.push('　　　　　　' + subject);

        lines.push('');

        // Body
        var greeting = replacePlaceholders(data.templateGreeting, data);
        var body = replacePlaceholders(data.templateBody, data);
        lines.push('　' + greeting);
        lines.push('　' + body);

        lines.push('');

        // Closing
        lines.push('　　　　　　　　　　　　　　　　　　　　敬具');

        lines.push('');

        // Details header
        lines.push('　　　　　　　　　　　記');

        lines.push('');

        // Details
        var details = [];
        details.push({ label: '研修名', value: data.trainingName || '（未入力）' });
        details.push({ label: '課目名', value: data.subjectName || '（未入力）' });
        details.push({ label: '日　時', value: data.dateTime || '（未入力）' });
        if (data.venue) {
            details.push({ label: '場　所', value: data.venue });
        }
        if (data.honorarium) {
            details.push({ label: '謝金等', value: data.honorarium });
        }

        for (var i = 0; i < details.length; i++) {
            var num = toFullWidth(i + 1);
            lines.push('　' + num + '　' + details[i].label + '　　' + details[i].value);
        }

        lines.push('');

        // End
        lines.push('　　　　　　　　　　　　　　　　　　　　以上');

        return lines.join('\n');
    }

    // ===== Preview Update =====

    function updatePreview() {
        var data = getFormData();
        preview.innerHTML = generateDocumentHTML(data);
    }

    // ===== Clipboard =====

    function copyToClipboard() {
        var data = getFormData();
        var text = generatePlainText(data);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showCopied();
            }).catch(function () {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopied();
        } catch (e) {
            alert('コピーに失敗しました。手動でコピーしてください。');
        }
        document.body.removeChild(textarea);
    }

    function showCopied() {
        copyBtn.textContent = 'コピーしました！';
        copyBtn.classList.add('copied');
        setTimeout(function () {
            copyBtn.textContent = 'クリップボードにコピー';
            copyBtn.classList.remove('copied');
        }, 2000);
    }
});
