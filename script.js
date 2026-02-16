document.addEventListener('DOMContentLoaded', function () {
    // DOM references
    var form = document.getElementById('request-form');
    var preview = document.getElementById('document-preview');
    var copyBtn = document.getElementById('copy-btn');
    var copyAllBtn = document.getElementById('copy-all-btn');
    var printBtn = document.getElementById('print-btn');

    // CSV DOM references
    var csvFileInput = document.getElementById('csv-file');
    var csvClearBtn = document.getElementById('csv-clear-btn');
    var csvStatus = document.getElementById('csv-status');
    var csvTableWrapper = document.querySelector('.csv-table-wrapper');
    var csvTableHead = document.querySelector('#csv-preview-table thead');
    var csvTableBody = document.querySelector('#csv-preview-table tbody');

    // Navigation DOM references
    var docNav = document.getElementById('doc-nav');
    var navPrev = document.getElementById('nav-prev');
    var navNext = document.getElementById('nav-next');
    var navInfo = document.getElementById('nav-info');

    // State
    var csvData = [];
    var csvHeaders = [];
    var currentDocIndex = 0;

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
    copyBtn.addEventListener('click', function () { copyToClipboard(false); });
    copyAllBtn.addEventListener('click', function () { copyToClipboard(true); });
    printBtn.addEventListener('click', handlePrint);
    csvFileInput.addEventListener('change', handleCSVUpload);
    csvClearBtn.addEventListener('click', clearCSV);
    navPrev.addEventListener('click', function () { navigateDoc(-1); });
    navNext.addEventListener('click', function () { navigateDoc(1); });

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

    // ===== CSV Parsing =====

    function parseCSV(text) {
        // Remove BOM
        text = text.replace(/^\uFEFF/, '');

        var rows = [];
        var currentRow = [];
        var currentField = '';
        var inQuotes = false;
        var i = 0;

        while (i < text.length) {
            var ch = text[i];

            if (inQuotes) {
                if (ch === '"') {
                    if (i + 1 < text.length && text[i + 1] === '"') {
                        currentField += '"';
                        i += 2;
                    } else {
                        inQuotes = false;
                        i++;
                    }
                } else {
                    currentField += ch;
                    i++;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                    i++;
                } else if (ch === ',') {
                    currentRow.push(currentField.trim());
                    currentField = '';
                    i++;
                } else if (ch === '\r') {
                    if (i + 1 < text.length && text[i + 1] === '\n') {
                        i++;
                    }
                    currentRow.push(currentField.trim());
                    currentField = '';
                    if (currentRow.length > 0 && currentRow.some(function (c) { return c !== ''; })) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    i++;
                } else if (ch === '\n') {
                    currentRow.push(currentField.trim());
                    currentField = '';
                    if (currentRow.length > 0 && currentRow.some(function (c) { return c !== ''; })) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    i++;
                } else {
                    currentField += ch;
                    i++;
                }
            }
        }

        // Last field/row
        currentRow.push(currentField.trim());
        if (currentRow.length > 0 && currentRow.some(function (c) { return c !== ''; })) {
            rows.push(currentRow);
        }

        return rows;
    }

    function detectAndDecodeCSV(arrayBuffer) {
        // Try UTF-8 first
        var utf8Text;
        try {
            var decoder = new TextDecoder('utf-8', { fatal: true });
            utf8Text = decoder.decode(arrayBuffer);
            // Check if it contains common Japanese characters properly
            if (/[\u3000-\u9FFF]/.test(utf8Text) || /^[\x00-\x7F\r\n]*$/.test(utf8Text)) {
                return utf8Text;
            }
        } catch (e) {
            // UTF-8 decoding failed, try Shift_JIS
        }

        // Try Shift_JIS
        try {
            var sjisDecoder = new TextDecoder('shift_jis', { fatal: false });
            return sjisDecoder.decode(arrayBuffer);
        } catch (e) {
            // Fallback to UTF-8 non-strict
            return new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
        }
    }

    // Column name mapping
    var COLUMN_MAP = {
        '研修名': 'trainingName',
        '講師名': 'instructorName',
        '所属': 'instructorAffiliation',
        '講師の所属': 'instructorAffiliation',
        '課目名': 'subjectName',
        '課目': 'subjectName',
        '日時': 'dateTime',
        '敬称': 'honorific',
        '研修場所': 'venue',
        '場所': 'venue',
        '謝金旅費': 'honorarium',
        '謝金': 'honorarium',
        '謝金・旅費': 'honorarium'
    };

    function mapHeaders(headerRow) {
        return headerRow.map(function (h) {
            var cleaned = h.trim();
            return COLUMN_MAP[cleaned] || null;
        });
    }

    function handleCSVUpload(event) {
        var file = event.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var arrayBuffer = e.target.result;
                var text = detectAndDecodeCSV(arrayBuffer);
                var rows = parseCSV(text);

                if (rows.length < 2) {
                    showCSVStatus('CSVにデータ行がありません。1行目はヘッダー、2行目以降がデータです。', true);
                    return;
                }

                var headerRow = rows[0];
                var mappedHeaders = mapHeaders(headerRow);

                // Validate required columns
                var required = ['trainingName', 'instructorName', 'instructorAffiliation', 'subjectName', 'dateTime'];
                var missing = [];
                for (var r = 0; r < required.length; r++) {
                    if (mappedHeaders.indexOf(required[r]) === -1) {
                        var labels = { trainingName: '研修名', instructorName: '講師名', instructorAffiliation: '所属', subjectName: '課目名', dateTime: '日時' };
                        missing.push(labels[required[r]]);
                    }
                }

                if (missing.length > 0) {
                    showCSVStatus('必須列が見つかりません: ' + missing.join(', '), true);
                    return;
                }

                // Parse data rows
                csvHeaders = mappedHeaders;
                csvData = [];
                for (var i = 1; i < rows.length; i++) {
                    var row = rows[i];
                    var record = {};
                    for (var j = 0; j < mappedHeaders.length; j++) {
                        if (mappedHeaders[j] && j < row.length) {
                            record[mappedHeaders[j]] = row[j];
                        }
                    }
                    // Skip rows with no instructor name
                    if (record.instructorName) {
                        csvData.push(record);
                    }
                }

                if (csvData.length === 0) {
                    showCSVStatus('有効なデータ行がありません。', true);
                    return;
                }

                currentDocIndex = 0;
                showCSVStatus(csvData.length + '件のデータを読み込みました。', false);
                renderCSVTable(headerRow, rows.slice(1));
                csvClearBtn.disabled = false;
                updateNavigation();
                updatePreview();

            } catch (err) {
                showCSVStatus('CSV読み込みエラー: ' + err.message, true);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function showCSVStatus(message, isError) {
        csvStatus.textContent = message;
        csvStatus.className = isError ? 'error' : 'success';
    }

    function renderCSVTable(headerRow, dataRows) {
        csvTableHead.innerHTML = '';
        csvTableBody.innerHTML = '';

        var tr = document.createElement('tr');
        tr.innerHTML = '<th>#</th>';
        for (var h = 0; h < headerRow.length; h++) {
            var th = document.createElement('th');
            th.textContent = headerRow[h];
            tr.appendChild(th);
        }
        csvTableHead.appendChild(tr);

        for (var i = 0; i < dataRows.length; i++) {
            var row = dataRows[i];
            // Skip empty rows
            if (!row.some(function (c) { return c !== ''; })) continue;
            var rowTr = document.createElement('tr');
            rowTr.innerHTML = '<td>' + (i + 1) + '</td>';
            for (var j = 0; j < headerRow.length; j++) {
                var td = document.createElement('td');
                td.textContent = (j < row.length) ? row[j] : '';
                rowTr.appendChild(td);
            }
            rowTr.addEventListener('click', (function (idx) {
                return function () {
                    currentDocIndex = idx;
                    updateNavigation();
                    updatePreview();
                };
            })(i));
            csvTableBody.appendChild(rowTr);
        }

        csvTableWrapper.classList.add('visible');
    }

    function highlightTableRow() {
        var rows = csvTableBody.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
            rows[i].classList.toggle('active', i === currentDocIndex);
        }
    }

    function clearCSV() {
        csvData = [];
        csvHeaders = [];
        currentDocIndex = 0;
        csvFileInput.value = '';
        csvStatus.textContent = '';
        csvStatus.className = '';
        csvTableHead.innerHTML = '';
        csvTableBody.innerHTML = '';
        csvTableWrapper.classList.remove('visible');
        csvClearBtn.disabled = true;
        updateNavigation();
        updatePreview();
    }

    // ===== Navigation =====

    function updateNavigation() {
        if (csvData.length > 1) {
            docNav.style.display = 'flex';
            copyAllBtn.style.display = '';
            copyBtn.textContent = '現在の1件をコピー';
            navInfo.textContent = (currentDocIndex + 1) + ' / ' + csvData.length + ' 件';
            navPrev.disabled = (currentDocIndex === 0);
            navNext.disabled = (currentDocIndex === csvData.length - 1);
            highlightTableRow();
        } else if (csvData.length === 1) {
            docNav.style.display = 'none';
            copyAllBtn.style.display = 'none';
            copyBtn.textContent = 'クリップボードにコピー';
        } else {
            docNav.style.display = 'none';
            copyAllBtn.style.display = 'none';
            copyBtn.textContent = 'クリップボードにコピー';
        }
    }

    function navigateDoc(delta) {
        var newIndex = currentDocIndex + delta;
        if (newIndex >= 0 && newIndex < csvData.length) {
            currentDocIndex = newIndex;
            updateNavigation();
            updatePreview();
        }
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

    function mergeCSVRowWithForm(csvRow, formData) {
        var merged = {};
        // Copy all form data as base
        for (var key in formData) {
            merged[key] = formData[key];
        }
        // Override with CSV data (only if CSV value is non-empty)
        if (csvRow.trainingName) merged.trainingName = csvRow.trainingName;
        if (csvRow.instructorName) merged.instructorName = csvRow.instructorName;
        if (csvRow.instructorAffiliation) merged.instructorAffiliation = csvRow.instructorAffiliation;
        if (csvRow.subjectName) merged.subjectName = csvRow.subjectName;
        if (csvRow.dateTime) merged.dateTime = csvRow.dateTime;
        // Extended columns: CSV overrides form if present
        if (csvRow.honorific) merged.honorific = csvRow.honorific;
        if (csvRow.venue) merged.venue = csvRow.venue;
        if (csvRow.honorarium) merged.honorarium = csvRow.honorarium;
        return merged;
    }

    // ===== Document Generation (HTML) =====

    function generateDocumentHTML(data) {
        var dateStr = formatJapaneseDate(data.issueDate);

        var html = '<p class="doc-date">' + escapeHTML(dateStr) + '</p>';

        if (data.documentNumber) {
            html += '<p class="doc-number">' + escapeHTML(data.documentNumber) + '</p>';
        }

        html += '<div class="doc-recipient">';
        html += '<p>' + (escapeHTML(data.instructorAffiliation) || '<span class="doc-placeholder">（講師の所属）</span>') + '</p>';
        html += '<p class="recipient-name">' +
            (escapeHTML(data.instructorName) || '<span class="doc-placeholder">（講師名）</span>') +
            '　' + escapeHTML(data.honorific) + '</p>';
        html += '</div>';

        html += '<div class="doc-sender">';
        html += '<p>' + (escapeHTML(data.senderOrg) || '<span class="doc-placeholder">（差出人組織名）</span>') + '</p>';
        if (data.senderPosition || data.senderName) {
            html += '<p>' + escapeHTML(data.senderPosition) + '　' + escapeHTML(data.senderName) + '</p>';
        }
        html += '</div>';

        var subject = replacePlaceholders(data.templateSubject, data);
        html += '<p class="doc-subject">' + escapeHTML(subject) + '</p>';

        var greeting = replacePlaceholders(data.templateGreeting, data);
        var body = replacePlaceholders(data.templateBody, data);
        html += '<div class="doc-body">';
        html += '<p>' + escapeHTML(greeting) + '</p>';
        html += '<p>' + escapeHTML(body) + '</p>';
        html += '</div>';

        html += '<p class="doc-closing">敬具</p>';
        html += '<p class="doc-details-header">記</p>';

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

        html += '<p class="doc-end">以上</p>';

        return html;
    }

    // ===== Document Generation (Plain Text) =====

    function generatePlainText(data) {
        var dateStr = formatJapaneseDate(data.issueDate);
        var lines = [];

        lines.push('　　　　　　　　　　　　　　　　　　　　' + dateStr);
        if (data.documentNumber) {
            lines.push('　　　　　　　　　　　　　　　　　　　　' + data.documentNumber);
        }
        lines.push('');
        lines.push((data.instructorAffiliation || '（講師の所属）'));
        lines.push('　' + (data.instructorName || '（講師名）') + '　' + data.honorific);
        lines.push('');
        lines.push('　　　　　　　　　　　　' + (data.senderOrg || '（差出人組織名）'));
        if (data.senderPosition || data.senderName) {
            lines.push('　　　　　　　　　　　　' + (data.senderPosition || '') + '　' + (data.senderName || ''));
        }
        lines.push('');
        lines.push('');

        var subject = replacePlaceholders(data.templateSubject, data);
        lines.push('　　　　　　' + subject);
        lines.push('');

        var greeting = replacePlaceholders(data.templateGreeting, data);
        var body = replacePlaceholders(data.templateBody, data);
        lines.push('　' + greeting);
        lines.push('　' + body);
        lines.push('');
        lines.push('　　　　　　　　　　　　　　　　　　　　敬具');
        lines.push('');
        lines.push('　　　　　　　　　　　記');
        lines.push('');

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
        lines.push('　　　　　　　　　　　　　　　　　　　　以上');

        return lines.join('\n');
    }

    // ===== Preview Update =====

    function updatePreview() {
        var formData = getFormData();

        if (csvData.length > 0) {
            // CSV mode: show current document
            var merged = mergeCSVRowWithForm(csvData[currentDocIndex], formData);
            preview.innerHTML = generateDocumentHTML(merged);
        } else {
            // Manual mode: single document
            preview.innerHTML = generateDocumentHTML(formData);
        }
    }

    // ===== Print =====

    function handlePrint() {
        if (csvData.length > 1) {
            // Generate all documents for printing
            var formData = getFormData();
            var allHTML = '';
            for (var i = 0; i < csvData.length; i++) {
                var merged = mergeCSVRowWithForm(csvData[i], formData);
                allHTML += '<div class="doc-page">' + generateDocumentHTML(merged) + '</div>';
            }
            preview.innerHTML = allHTML;
            setTimeout(function () {
                window.print();
                // Restore current preview after printing
                updatePreview();
            }, 100);
        } else {
            window.print();
        }
    }

    // ===== Clipboard =====

    function copyToClipboard(copyAll) {
        var formData = getFormData();
        var text;

        if (csvData.length > 0 && copyAll) {
            // Copy all documents
            var texts = [];
            for (var i = 0; i < csvData.length; i++) {
                var merged = mergeCSVRowWithForm(csvData[i], formData);
                texts.push(generatePlainText(merged));
            }
            text = texts.join('\n\n' + '='.repeat(40) + '\n\n');
        } else if (csvData.length > 0) {
            // Copy current document
            var merged = mergeCSVRowWithForm(csvData[currentDocIndex], formData);
            text = generatePlainText(merged);
        } else {
            // Manual mode
            text = generatePlainText(formData);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showCopied(copyAll);
            }).catch(function () {
                fallbackCopy(text, copyAll);
            });
        } else {
            fallbackCopy(text, copyAll);
        }
    }

    function fallbackCopy(text, copyAll) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopied(copyAll);
        } catch (e) {
            alert('コピーに失敗しました。手動でコピーしてください。');
        }
        document.body.removeChild(textarea);
    }

    function showCopied(copyAll) {
        var btn = copyAll ? copyAllBtn : copyBtn;
        var originalText = btn.textContent;
        btn.textContent = 'コピーしました！';
        btn.classList.add('copied');
        setTimeout(function () {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 2000);
    }
});
