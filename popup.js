/**
 * LeetCode Tracker — Popup Script v2.0
 * 间隔复习（Spaced Repetition）：1 → 3 → 7 → 14 → 30 天
 */

(function () {
  'use strict';

  // ─── 间隔复习配置 ──────────────────────────────────────────────────────────────
  const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];

  // reviewCount 对应的展示标签
  // reviewCount=0 表示刚做完还未复习，1 表示已经复习过1次，以此类推
  function reviewLabel(reviewCount) {
    if (reviewCount === 0) return '初次复习';
    if (reviewCount <= 4)  return `第${reviewCount}次复习`;
    return `第${reviewCount}次复习`;
  }

  // 完成本次复习后，下次间隔多少天
  function nextIntervalDays(reviewCount) {
    return REVIEW_INTERVALS_DAYS[Math.min(reviewCount + 1, REVIEW_INTERVALS_DAYS.length - 1)];
  }

  // ─── 时间工具 ────────────────────────────────────────────────────────────────

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  const TODAY_START = startOfDay(Date.now());

  function isToday(ts) { return ts >= TODAY_START && ts < TODAY_START + 86_400_000; }

  function formatDateTime(ts) {
    const d = new Date(ts);
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2, '0');
    const min  = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const dd  = String(d.getDate()).padStart(2, '0');
    const mm  = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function formatWeekday(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { weekday: 'short' });
  }

  /** 距今逾期多少天（今天到期 = 0，昨天到期 = 1，以此类推） */
  function overdueDays(nextReviewAt) {
    const dueDay = startOfDay(nextReviewAt);
    if (dueDay >= TODAY_START) return 0;
    return Math.floor((TODAY_START - dueDay) / 86_400_000);
  }

  // ─── 状态 ────────────────────────────────────────────────────────────────────
  let selectedTimestamps = new Set();

  // ─── 徽章 ────────────────────────────────────────────────────────────────────

  function difficultyBadge(difficulty) {
    if (!difficulty) return '';
    const lower = difficulty.toLowerCase();
    if (lower === 'easy')   return `<span class="badge badge-easy">Easy</span>`;
    if (lower === 'medium') return `<span class="badge badge-medium">Medium</span>`;
    if (lower === 'hard')   return `<span class="badge badge-hard">Hard</span>`;
    return `<span class="badge badge-unknown">${difficulty}</span>`;
  }

  // ─── 渲染"待复习"条目（间隔复习专用）────────────────────────────────────────

  function renderReviewItem(title, scheduleInfo, isDoneToday) {
    const li = document.createElement('li');
    li.className = 'problem-row';

    const slug = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-');
    const href = slug ? `https://leetcode.com/problems/${slug}/` : 'https://leetcode.com/';

    const overdue = overdueDays(scheduleInfo.nextReviewAt);
    const overdueHtml = overdue > 0
      ? `<span class="badge badge-overdue">逾期 ${overdue} 天</span>`
      : `<span class="badge badge-due-today">今日到期</span>`;

    const afterDays = nextIntervalDays(scheduleInfo.reviewCount);
    const doneClass = isDoneToday ? 'review-done' : '';

    li.innerHTML = `
      <span class="row-checkbox-placeholder"></span>
      <a class="problem-item review ${doneClass}" href="${href}" target="_blank" rel="noopener">
        <div class="problem-info">
          <div class="problem-title">${title}</div>
          <div class="problem-meta">
            ${difficultyBadge(scheduleInfo.difficulty)}
            ${scheduleInfo.category ? `<span class="problem-category">${scheduleInfo.category}</span>` : ''}
            <span class="badge badge-review-stage">${reviewLabel(scheduleInfo.reviewCount)}</span>
            ${isDoneToday ? '<span class="badge badge-done-today">✓ 今日已复习</span>' : overdueHtml}
          </div>
        </div>
        ${isDoneToday ? '' : `<span class="review-after-label">完成后 +${afterDays}天</span>`}
      </a>
    `;

    return li;
  }

  // ─── 渲染普通条目（今天完成 / 历史）─────────────────────────────────────────

  function renderItem(sub, { showCheckbox, reviewCount }) {
    const li = document.createElement('li');
    li.className = 'problem-row';
    li.dataset.ts = sub.timestamp;

    const slug = (sub.title || '')
      .toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-');
    const href = slug
      ? `https://leetcode.com/problems/${slug}/`
      : 'https://leetcode.com/';

    const reviewBadge = reviewCount > 0
      ? `<span class="badge badge-review">🔁 ${reviewCount}</span>`
      : '';

    const checkboxHtml = showCheckbox ? `
      <label class="row-checkbox-wrap" title="选择">
        <input type="checkbox" class="row-checkbox" data-ts="${sub.timestamp}"
               ${selectedTimestamps.has(sub.timestamp) ? 'checked' : ''} />
        <span class="checkbox-visual"></span>
      </label>` : `<span class="row-checkbox-placeholder"></span>`;

    li.innerHTML = `
      ${checkboxHtml}
      <a class="problem-item" href="${href}" target="_blank" rel="noopener">
        <div class="problem-info">
          <div class="problem-title">${sub.title || '未知题目'}</div>
          <div class="problem-meta">
            ${difficultyBadge(sub.difficulty)}
            ${sub.category ? `<span class="problem-category">${sub.category}</span>` : ''}
            ${reviewBadge}
          </div>
        </div>
        <span class="problem-time">${formatDateTime(sub.timestamp)}</span>
      </a>
    `;

    if (showCheckbox) {
      const checkbox = li.querySelector('.row-checkbox');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedTimestamps.add(sub.timestamp);
        else selectedTimestamps.delete(sub.timestamp);
        updateDeleteBar();
      });
    }

    return li;
  }

  // ─── 渲染历史（按日期分组）───────────────────────────────────────────────────

  function renderHistory(historySubs, container, reviewSchedule) {
    container.innerHTML = '';
    if (historySubs.length === 0) return;

    const groups = {};
    for (const sub of historySubs) {
      const day = startOfDay(sub.timestamp);
      if (!groups[day]) groups[day] = [];
      groups[day].push(sub);
    }

    const sortedDays = Object.keys(groups).map(Number).sort((a, b) => b - a);

    sortedDays.forEach((dayTs, idx) => {
      const daySubs = groups[dayTs].sort((a, b) => b.timestamp - a.timestamp);
      const dateStr = formatDate(dayTs);
      const weekday = formatWeekday(dayTs);
      const count   = daySubs.length;

      const block = document.createElement('div');
      block.className = 'history-group';

      const header = document.createElement('div');
      header.className = 'history-group-header';
      header.innerHTML = `
        <div class="history-date-left">
          <span class="history-weekday">${weekday}</span>
          <span class="history-date">${dateStr}</span>
        </div>
        <div class="history-date-right">
          <span class="history-count">${count} 题</span>
          <span class="history-toggle">▾</span>
        </div>
      `;

      const ul = document.createElement('ul');
      ul.className = 'problem-list history-group-list';
      if (idx > 0) ul.classList.add('collapsed');
      else header.querySelector('.history-toggle').classList.add('open');

      daySubs.forEach((sub) => {
        const schedInfo = reviewSchedule[sub.title];
        ul.appendChild(renderItem(sub, {
          showCheckbox: true,
          reviewCount:  schedInfo ? schedInfo.reviewCount : 0,
        }));
      });

      header.addEventListener('click', () => {
        const isOpen = !ul.classList.contains('collapsed');
        ul.classList.toggle('collapsed', isOpen);
        header.querySelector('.history-toggle').classList.toggle('open', !isOpen);
      });

      block.appendChild(header);
      block.appendChild(ul);
      container.appendChild(block);
    });
  }

  // ─── 删除栏 ───────────────────────────────────────────────────────────────────

  function updateDeleteBar() {
    const bar   = document.getElementById('delete-bar');
    const count = selectedTimestamps.size;
    if (count > 0) {
      bar.classList.add('show');
      document.getElementById('delete-bar-count').textContent = `已选 ${count} 条`;
    } else {
      bar.classList.remove('show');
    }
  }

  function deleteSelected() {
    if (selectedTimestamps.size === 0) return;
    chrome.storage.local.get(['submissions'], (result) => {
      const submissions = (result.submissions || []).filter(
        (s) => !selectedTimestamps.has(s.timestamp)
      );
      chrome.storage.local.set({ submissions }, () => {
        selectedTimestamps.clear();
        updateDeleteBar();
        loadAndRender();
      });
    });
  }

  // ─── 旧数据迁移 ───────────────────────────────────────────────────────────────
  // 如果用户已有 submissions 但还没有 reviewSchedule，自动从历史记录初始化

  function migrateIfNeeded(submissions, reviewSchedule) {
    if (Object.keys(reviewSchedule).length > 0 || submissions.length === 0) {
      return reviewSchedule; // 已经有计划，无需迁移
    }

    const schedule = {};
    // 按时间正序处理：第一次出现 = 初次刷，后续出现 = 复习
    const sorted = [...submissions].sort((a, b) => a.timestamp - b.timestamp);

    for (const sub of sorted) {
      if (!schedule[sub.title]) {
        const solvedDay = startOfDay(sub.timestamp);
        schedule[sub.title] = {
          reviewCount:    0,
          firstSolvedAt:  sub.timestamp,
          lastReviewedAt: sub.timestamp,
          nextReviewAt:   solvedDay + REVIEW_INTERVALS_DAYS[0] * 86_400_000,
          difficulty:     sub.difficulty,
          category:       sub.category,
        };
      } else {
        const existing   = schedule[sub.title];
        const newCount   = existing.reviewCount + 1;
        const reviewDay  = startOfDay(sub.timestamp);
        const days       = REVIEW_INTERVALS_DAYS[Math.min(newCount, REVIEW_INTERVALS_DAYS.length - 1)];
        schedule[sub.title] = {
          ...existing,
          reviewCount:    newCount,
          lastReviewedAt: sub.timestamp,
          nextReviewAt:   reviewDay + days * 86_400_000,
          difficulty:     sub.difficulty || existing.difficulty,
          category:       sub.category   || existing.category,
        };
      }
    }

    // 异步持久化迁移结果
    chrome.storage.local.set({ reviewSchedule: schedule });
    return schedule;
  }

  // ─── 主渲染 ───────────────────────────────────────────────────────────────────

  function render(submissions, reviewSchedule) {
    const byTimeDesc  = (a, b) => b.timestamp - a.timestamp;
    const todaySubs   = submissions.filter((s) => isToday(s.timestamp)).sort(byTimeDesc);
    const historySubs = submissions.filter((s) => !isToday(s.timestamp)).sort(byTimeDesc);

    // 今天已做的题（这些不再出现在待复习里）
    const todayTitles = new Set(todaySubs.map((s) => s.title));

    // ── 待复习：nextReviewAt 落在今天或之前，且今天没重新提交 ──
    const dueReviews = Object.entries(reviewSchedule)
      .filter(([title, info]) =>
        startOfDay(info.nextReviewAt) <= TODAY_START && !todayTitles.has(title)
      )
      .map(([title, info]) => ({ title, ...info }))
      // 逾期越多越靠前；同等逾期按难度排：Hard > Medium > Easy
      .sort((a, b) => {
        const diffA = overdueDays(a.nextReviewAt);
        const diffB = overdueDays(b.nextReviewAt);
        if (diffB !== diffA) return diffB - diffA;
        const order = { Hard: 2, Medium: 1, Easy: 0 };
        return (order[b.difficulty] || 0) - (order[a.difficulty] || 0);
      });

    // ── 统计栏 ──
    document.getElementById('stat-total').textContent  = Object.keys(reviewSchedule).length;
    document.getElementById('stat-today').textContent  = todaySubs.length;
    document.getElementById('stat-review').textContent = dueReviews.length;

    document.getElementById('empty-state').style.display =
      submissions.length === 0 ? 'flex' : 'none';

    // ── 待复习区 ──
    const reviewSection = document.getElementById('section-review');
    if (dueReviews.length > 0) {
      reviewSection.classList.remove('hidden');
      const ul = document.getElementById('list-review');
      ul.innerHTML = '';
      dueReviews.forEach((item) => {
        ul.appendChild(renderReviewItem(item.title, item, item.doneToday));
      });
    } else {
      reviewSection.classList.add('hidden');
    }

    // ── 今天完成 ──
    const todaySection = document.getElementById('section-today');
    if (todaySubs.length > 0) {
      todaySection.classList.remove('hidden');
      const ul = document.getElementById('list-today');
      ul.innerHTML = '';
      todaySubs.forEach((sub) => {
        const schedInfo = reviewSchedule[sub.title];
        ul.appendChild(renderItem(sub, {
          showCheckbox: true,
          reviewCount:  schedInfo ? schedInfo.reviewCount : 0,
        }));
      });
    } else {
      todaySection.classList.add('hidden');
    }

    // ── 历史 ──
    const historySection = document.getElementById('section-history');
    if (historySubs.length > 0) {
      historySection.classList.remove('hidden');
      renderHistory(historySubs, document.getElementById('list-history'), reviewSchedule);
    } else {
      historySection.classList.add('hidden');
    }
  }

  // ─── 加载并渲染 ───────────────────────────────────────────────────────────────

  function loadAndRender() {
    chrome.storage.local.get(['submissions', 'reviewSchedule'], (result) => {
      const submissions    = result.submissions    || [];
      const rawSchedule    = result.reviewSchedule || {};
      const reviewSchedule = migrateIfNeeded(submissions, rawSchedule);
      render(submissions, reviewSchedule);
    });
  }

  // ─── 初始化 ──────────────────────────────────────────────────────────────────

  function init() {
    loadAndRender();

    const toggleBtn   = document.getElementById('toggle-history');
    const historyList = document.getElementById('list-history');
    const toggleIcon  = document.querySelector('.toggle-icon');
    toggleBtn.addEventListener('click', () => {
      const open = !historyList.classList.contains('collapsed');
      historyList.classList.toggle('collapsed', open);
      toggleIcon.classList.toggle('open', !open);
    });

    document.getElementById('btn-clear').addEventListener('click', showConfirm);
    document.getElementById('btn-delete-selected').addEventListener('click', deleteSelected);
    document.getElementById('btn-cancel-select').addEventListener('click', () => {
      selectedTimestamps.clear();
      document.querySelectorAll('.row-checkbox').forEach((cb) => (cb.checked = false));
      updateDeleteBar();
    });
  }

  // ─── 确认弹窗 ────────────────────────────────────────────────────────────────

  function showConfirm() {
    let overlay = document.getElementById('confirm-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-box">
          <p>确定要清除所有刷题记录吗？<br>
             <small style="color:#9ca3af">此操作不可撤销</small></p>
          <div class="confirm-actions">
            <button id="confirm-yes">清除</button>
            <button id="confirm-no">取消</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      document.getElementById('confirm-yes').addEventListener('click', () => {
        chrome.storage.local.set({ submissions: [], reviewSchedule: {} }, () => {
          overlay.classList.remove('show');
          selectedTimestamps.clear();
          updateDeleteBar();
          render([], {});
        });
      });
      document.getElementById('confirm-no').addEventListener('click', () => {
        overlay.classList.remove('show');
      });
    }
    overlay.classList.add('show');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
