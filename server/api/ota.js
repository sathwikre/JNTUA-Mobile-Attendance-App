/**
 * OTA API Endpoint — Deploy this to Vercel, Render, Railway, etc.
 *
 * Endpoint: GET /api/ota/latest?appVersion=1.0.0&platform=android
 *
 * In production, store the script + config in a database or JSON file
 * that you can update without redeploying.
 */

const LATEST_OTA = {
  version: 3,
  scraperScript: `
(function() {
  'use strict';
  // === OTA Updated Scraper v3 ===
  // Update this script when the college website HTML changes.
  // Previous fix: table selector changed from 'table.table' to 'table.table-striped'

  const BASE_URL = 'https://jntuaceastudents.classattendance.in/';

  function debug(msg) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: msg }));
  }

  function getHiddenFieldsFromInputs(inputs) {
    const fields = {};
    inputs.forEach(inp => { if (inp.name) fields[inp.name] = inp.value; });
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
    // OTA FIX v3: College changed table class
    const table = doc.querySelector('table.table-striped') || doc.querySelector('table.table');
    if (!table) return null;
    const rows = table.querySelectorAll('tbody tr');
    const records = [];
    rows.forEach(row => {
      const cols = row.querySelectorAll('td');
      if (cols.length >= 3) {
        const date = cols[0].textContent.trim();
        const statusSpan = cols[2].querySelector('span.badge') || cols[2].querySelector('span');
        let status = statusSpan ? statusSpan.textContent.trim() : cols[2].textContent.trim();
        if (status.includes('Present')) status = 'Present';
        else if (status.includes('Absent')) status = 'Absent';
        if (date) records.push({ date, status });
      }
    });
    return records;
  }

  function extractStudentDetails() {
    const details = { name: '', username: '' };
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
    return details;
  }

  function extractSubjectsFromSubjectsPage(html) {
    const doc = parseHTML(html);
    const tbody = doc.querySelector('table.table tbody') || doc.querySelector('table tbody');
    if (!tbody) return [];
    const subjects = [];
    let currentForm = null;
    let currentInputs = [];
    function saveCurrentForm() {
      if (currentForm && currentInputs.length > 0) {
        const data = getHiddenFieldsFromInputs(currentInputs);
        if (data.subject_id && data.sub_fullname) subjects.push(data);
      }
      currentForm = null; currentInputs = [];
    }
    const children = tbody.childNodes;
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'form' && node.getAttribute('action') === 'studentsubatt.php') {
          saveCurrentForm(); currentForm = node; currentInputs = [];
        } else if (tag === 'input' && node.type === 'hidden') {
          if (currentForm) currentInputs.push(node);
        } else if (tag === 'tr' && currentForm) { saveCurrentForm(); }
      }
    }
    saveCurrentForm();
    return subjects;
  }

  async function scrapeAll() {
    try {
      debug('Scraper v3 started (OTA)');
      await waitForDOM();
      const student = extractStudentDetails();
      const cards = document.querySelectorAll('.card.bg-light');
      if (!cards.length) throw new Error('No semester cards found');
      let semesterCard = null;
      for (const card of cards) { if (card.classList.contains('text-primary')) { semesterCard = card; break; } }
      if (!semesterCard) semesterCard = cards[0];
      const semesterName = semesterCard.querySelector('.card-title')?.textContent?.trim() || 'Unknown';
      const form = semesterCard.querySelector('form[action="studentsubjects.php"]');
      if (!form) throw new Error('Form not found');
      const payload = getHiddenFieldsFromInputs(form.querySelectorAll('input[type="hidden"]'));
      const subjectsHTML = await postHTML(BASE_URL + 'studentsubjects.php', payload);
      const subjects = extractSubjectsFromSubjectsPage(subjectsHTML);
      if (!subjects.length) throw new Error('No subjects extracted');
      const results = [];
      for (let i = 0; i < subjects.length; i += 5) {
        const chunk = subjects.slice(i, i + 5);
        const cr = await Promise.all(chunk.map(async (sub) => {
          try {
            const attHTML = await postHTML(BASE_URL + 'studentsubatt.php', sub);
            const records = parseAttendanceTable(attHTML);
            if (!records) return { subject: sub.sub_fullname, code: sub.subcode||'', total:0, present:0, absent:0, percentage:0, records:[], error:'No table' };
            const total = records.length;
            const present = records.filter(r => r.status === 'Present').length;
            const pct = total > 0 ? Math.round((present/total)*1000)/10 : 0;
            return { subject: sub.sub_fullname, code: sub.subcode||'', total, present, absent: total-present, percentage: pct, records };
          } catch (err) { return { subject: sub.sub_fullname, code: sub.subcode||'', total:0, present:0, absent:0, percentage:0, records:[], error: err.message }; }
        }));
        results.push(...cr);
      }
      const totalDays = results.reduce((s,r) => s+r.total, 0);
      const totalPresent = results.reduce((s,r) => s+r.present, 0);
      const overallPercent = totalDays > 0 ? Math.round((totalPresent/totalDays)*10000)/100 : 0;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type:'attendance_complete', semester:semesterName, subjects:results,
        overall:{totalDays,totalPresent,overallPercent},
        studentName:student.name, studentId:student.username,
      }));
    } catch (err) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',message:err.message}));
    }
  }
  scrapeAll();
})();
true;
  `,
  config: {
    colors: {
      safe: '#22C55E',
      caution: '#EAB308',
      warning: '#F59E0B',
      danger: '#EF4444',
      accent: '#7C3AED',
      info: '#6366F1',
    },
    labels: {
      safe: '✅ Safe',
      caution: '⚠️ Caution',
      risk: '⚠️ Risk',
      low: '❌ Low',
    },
    thresholds: {
      safe: 77,
      minimum: 75,
      warning: 70,
    },
    accentColor: '#7C3AED',
    portalUrl: 'https://jntuaceastudents.classattendance.in/',
    showQuickTip: true,
  },
  minAppVersion: '1.0.0',
  changelog: 'Fixed: college changed table class from table.table to table.table-striped',
};

/* ── Vercel Serverless Function ── */
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const appVersion = req.query.appVersion || '0.0.0';
  const platform = req.query.platform || 'unknown';

  if (LATEST_OTA.minAppVersion && appVersion < LATEST_OTA.minAppVersion) {
    return res.status(200).json({
      needsUpdate: true,
      message: 'Please update your app',
      minAppVersion: LATEST_OTA.minAppVersion,
    });
  }

  console.log('OTA v' + LATEST_OTA.version + ' served to ' + platform + ' app v' + appVersion);
  return res.status(200).json(LATEST_OTA);
};
