export const SCRAPER_SCRIPT = `
(function() {
  'use strict';

  const BASE_URL = 'https://jntuaceastudents.classattendance.in/';

  function debug(msg) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: msg }));
  }

  function getHiddenFieldsFromInputs(inputs) {
    const fields = {};
    inputs.forEach(inp => {
      if (inp.name) fields[inp.name] = inp.value;
    });
    return fields;
  }

  function parseHTML(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  async function postHTML(url, data) {
    const formData = new URLSearchParams(data);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': BASE_URL + 'studentsubjects.php',
      },
      body: formData,
      credentials: 'include',
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.text();
  }

  function waitForDOM() {
    return new Promise(resolve => {
      if (document.readyState === 'complete') resolve();
      else setTimeout(() => waitForDOM().then(resolve), 200);
    });
  }

  function parseAttendanceTable(html) {
    const doc = parseHTML(html);
    const table = doc.querySelector('table.table');
    if (!table) return null;
    const rows = table.querySelectorAll('tbody tr');
    const records = [];
    rows.forEach(row => {
      const cols = row.querySelectorAll('td');
      if (cols.length >= 3) {
        const date = cols[0].textContent.trim();
        const statusSpan = cols[2].querySelector('span.badge');
        let status = statusSpan ? statusSpan.textContent.trim() : cols[2].textContent.trim();
        if (status.includes('Present')) status = 'Present';
        else if (status.includes('Absent')) status = 'Absent';
        if (date) records.push({ date, status });
      }
    });
    return records;
  }

  // ---- NEW: Extract student details from home page ----
  function extractStudentDetails() {
    const details = { name: '', username: '' };
    // Find "My Details" card
    const cards = document.querySelectorAll('.card');
    for (const card of cards) {
      const header = card.querySelector('.card-header');
      if (header && header.textContent.includes('My Details')) {
        const items = card.querySelectorAll('.list-group-item');
        items.forEach(li => {
          const strong = li.querySelector('strong');
          if (strong) {
            const key = strong.textContent.replace(':', '').trim();
            const value = li.textContent.replace(strong.textContent, '').trim();
            if (key === 'Username') details.username = value;
            else if (key === 'Name') details.name = value;
          }
        });
        break;
      }
    }
    debug('📋 Student details: ' + JSON.stringify(details));
    return details;
  }

  // Extract subjects from malformed subjects page
  function extractSubjectsFromSubjectsPage(html) {
    const doc = parseHTML(html);
    const tbody = doc.querySelector('table.table tbody');
    if (!tbody) {
      debug('⚠️ No tbody found in subjects page');
      return [];
    }

    const subjects = [];
    let currentForm = null;
    let currentInputs = [];

    function saveCurrentForm() {
      if (currentForm && currentInputs.length > 0) {
        const data = getHiddenFieldsFromInputs(currentInputs);
        if (data.subject_id && data.sub_fullname) {
          subjects.push(data);
        }
      }
      currentForm = null;
      currentInputs = [];
    }

    const children = tbody.childNodes;
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'form' && node.getAttribute('action') === 'studentsubatt.php') {
          saveCurrentForm();
          currentForm = node;
          currentInputs = [];
        } else if (tag === 'input' && node.type === 'hidden') {
          if (currentForm) currentInputs.push(node);
        } else if (tag === 'tr' && currentForm) {
          saveCurrentForm();
        }
      }
    }
    saveCurrentForm();

    debug('📋 Extracted ' + subjects.length + ' subjects');
    return subjects;
  }

  // Main scraper
  async function scrapeAll() {
    try {
      debug('🚀 Scraper started');
      await waitForDOM();
      debug('✅ DOM ready');

      // 1. Extract student details from home page
      const student = extractStudentDetails();

      // 2. Find semester cards
      const cards = document.querySelectorAll('.card.bg-light');
      debug('📋 Found ' + cards.length + ' semester cards');
      if (!cards.length) throw new Error('No semester cards found');

      let semesterCard = null;
      for (const card of cards) {
        if (card.classList.contains('text-primary')) {
          semesterCard = card;
          break;
        }
      }
      if (!semesterCard) {
        semesterCard = cards[0];
        debug('⚠️ No active semester, using first card');
      }

      const semesterName = semesterCard.querySelector('.card-title')?.textContent?.trim() || 'Unknown';
      debug('📚 Semester: ' + semesterName);

      const form = semesterCard.querySelector('form[action="studentsubjects.php"]');
      if (!form) throw new Error('Form not found in semester card');
      const payload = getHiddenFieldsFromInputs(form.querySelectorAll('input[type="hidden"]'));
      debug('📤 Payload: ' + JSON.stringify(payload));

      // 3. Fetch subjects page
      debug('⏳ Fetching subjects page...');
      const subjectsHTML = await postHTML(BASE_URL + 'studentsubjects.php', payload);
      debug('✅ Subjects page fetched, length: ' + subjectsHTML.length);

      // 4. Extract subjects
      const subjects = extractSubjectsFromSubjectsPage(subjectsHTML);
      if (!subjects.length) throw new Error('No subjects extracted');

      // 5. Fetch attendance for each subject
      const concurrency = 5;
      const results = [];
      for (let i = 0; i < subjects.length; i += concurrency) {
        const chunk = subjects.slice(i, i + concurrency);
        debug('⏳ Fetching batch of ' + chunk.length + ' subjects...');
        const chunkResults = await Promise.all(chunk.map(async (sub) => {
          try {
            debug('⏳ Fetching attendance for: ' + sub.sub_fullname);
            const attHTML = await postHTML(BASE_URL + 'studentsubatt.php', sub);
            const records = parseAttendanceTable(attHTML);
            if (!records) {
              return {
                subject: sub.sub_fullname,
                code: sub.subcode || '',
                total: 0,
                present: 0,
                absent: 0,
                percentage: 0,
                records: [],
                error: 'No attendance table'
              };
            }
            const total = records.length;
            const present = records.filter(r => r.status === 'Present').length;
            const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;
            debug('✅ ' + sub.sub_fullname + ' -> ' + total + ' records, ' + present + ' present, ' + pct + '%');
            return {
              subject: sub.sub_fullname,
              code: sub.subcode || '',
              total,
              present,
              absent: total - present,
              percentage: pct,
              records
            };
          } catch (err) {
            debug('❌ Error for ' + sub.sub_fullname + ': ' + err.message);
            return {
              subject: sub.sub_fullname,
              code: sub.subcode || '',
              total: 0,
              present: 0,
              absent: 0,
              percentage: 0,
              records: [],
              error: err.message
            };
          }
        }));
        results.push(...chunkResults);
        debug('✅ Batch done, total results: ' + results.length);
      }

      // 6. Compute overall stats
      const totalDays = results.reduce((s, r) => s + r.total, 0);
      const totalPresent = results.reduce((s, r) => s + r.present, 0);
      const overallPercent = totalDays > 0 ? Math.round((totalPresent / totalDays) * 10000) / 100 : 0;
      debug('📊 Overall: ' + totalPresent + '/' + totalDays + ' (' + overallPercent + '%)');

      // 7. Send final data including student details
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'attendance_complete',
        semester: semesterName,
        subjects: results,
        overall: { totalDays, totalPresent, overallPercent },
        studentName: student.name,
        studentId: student.username,
      }));
      debug('✅ Scraping completed successfully!');

    } catch (err) {
      debug('❌ Scraper error: ' + err.message);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        message: err.message
      }));
    }
  }

  debug('🚀 Scraper script injected');
  scrapeAll();
})();
true;
`;