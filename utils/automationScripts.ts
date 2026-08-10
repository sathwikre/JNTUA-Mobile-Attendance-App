declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (data: string) => void;
    };
  }
}

export interface StudentInfo {
  name: string;
  admissionNo: string;
  className: string;
}

export interface AttendanceRecord {
  date: string;
  time: string;
  status: 'Present' | 'Absent' | 'Unknown';
}

export interface SubjectAttendanceData {
  subjectName: string;
  present: number;
  absent: number;
  total: number;
  percentage: string;
  records: AttendanceRecord[];
}

export const autoSubmitFirstSemesterScript = `
  (function() {
    let admissionNo = '';
    let name = '';

    const listItems = Array.from(document.querySelectorAll('.list-group-item'));
    listItems.forEach(item => {
      const text = item.innerText || '';
      if (text.includes('Username:')) {
        admissionNo = text.replace('Username:', '').trim();
      }
      if (text.includes('Name:')) {
        name = text.replace('Name:', '').trim();
      }
    });

    const firstForm = document.querySelector('form[action="studentsubjects.php"]');
    let className = '';
    if (firstForm) {
      const classInput = firstForm.querySelector('input[name="classname"]');
      if (classInput) {
        className = classInput.value.trim();
      }
    }

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'STUDENT_INFO',
        data: { name, admissionNo, className }
      }));
    }

    if (firstForm) {
      firstForm.submit();
    }
  })();
  true;
`;

export const selectSubjectByIndexScript = (targetIndex: number): string => `
  (function() {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const rows = document.querySelectorAll('tr.clickable-row');
      
      if (rows.length > 0) {
        clearInterval(interval);
        
        const rn = window.ReactNativeWebView;
        if (rn) {
          rn.postMessage(JSON.stringify({
            type: 'SUBJECT_COUNT',
            count: rows.length
          }));
        }

        if (${targetIndex} < rows.length) {
          rows[${targetIndex}].click();
        } else if (rn) {
          rn.postMessage(JSON.stringify({
            type: 'SCRAPING_COMPLETE'
          }));
        }
      } else if (attempts >= 20) {
        clearInterval(interval);
      }
    }, 200);
  })();
  true;
`;

export const parseDetailedAttendanceAndGoHomeScript = `
  (function() {
    const subjectHeader = document.querySelector('.card-header:nth-child(2)');
    let subjectName = '';

    if (subjectHeader) {
      const text = subjectHeader.innerText.trim();
      const parts = text.split('\\n').map(p => p.trim()).filter(Boolean);
      subjectName = parts.length >= 2 ? parts[1] : text;
    }

    const records = [];
    let presentCount = 0;
    let absentCount = 0;

    const tableRows = document.querySelectorAll('table.table-bordered.table-striped tbody tr');
    tableRows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 3) {
        const date = cells[0].innerText.trim();
        const time = cells[1].innerText.trim();
        const badge = cells[2].querySelector('span.badge');
        const status = badge ? badge.innerText.trim() : 'Unknown';

        if (status === 'Present') presentCount++;
        if (status === 'Absent') absentCount++;

        records.push({ date, time, status });
      }
    });

    const total = presentCount + absentCount;
    const percentage = total > 0 ? ((presentCount / total) * 100).toFixed(2) : '0.00';

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ATTENDANCE_ITEM',
        data: {
          subjectName,
          present: presentCount,
          absent: absentCount,
          total,
          percentage,
          records
        }
      }));
    }

    setTimeout(() => {
      const homeBtn = document.querySelector('a[href="studenthome.php"]');
      if (homeBtn) {
        homeBtn.click();
      }
    }, 300);
  })();
  true;
`;