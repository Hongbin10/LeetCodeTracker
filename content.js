/**
 * LeetCode Tracker - Content Script v1.3
 * 新增：间隔复习（Spaced Repetition）支持
 * 间隔序列：1 → 3 → 7 → 14 → 30 天
 */

(function () {
  'use strict';

  // ─── 间隔复习配置 ──────────────────────────────────────────────────────────────
  // reviewCount = 0 时（刚刷完）→ 1 天后提醒
  // reviewCount = 1 时（第1次复习后）→ 3 天后提醒，以此类推
  const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];

  function getNextIntervalMs(reviewCount) {
    const days = REVIEW_INTERVALS_DAYS[Math.min(reviewCount, REVIEW_INTERVALS_DAYS.length - 1)];
    return days * 86_400_000;
  }

  // 这些词不是真实题目分类，直接忽略
  const INVALID_CATEGORIES = new Set([
    'Problem List', 'Problems', 'Explore', 'Contest',
    'Submit', 'Run', 'Console', 'Description', 'Editorial',
    'Solutions', 'Submissions', 'Accepted', 'Topics', 'Companies',
    'Hint', 'Notes', 'Debug', 'Easy', 'Medium', 'Hard',
    'Back', 'Next', 'Random', 'Shuffle',
  ]);

  function isValidCategory(text) {
    if (!text || text.length < 2 || text.length > 50) return false;
    if (INVALID_CATEGORIES.has(text)) return false;
    if (/^\d+$/.test(text)) return false;
    return true;
  }

  function extractProblemInfo() {
    const info = {
      title: null,
      number: null,
      difficulty: null,
      category: null,
      timestamp: Date.now(),
    };

    // ── 题名 & 编号（从 document.title 最稳定）──
    const titleMatch = document.title.match(/^(\d+)\.\s*(.+?)\s*-\s*LeetCode/i);
    if (titleMatch) {
      info.number = parseInt(titleMatch[1], 10);
      info.title  = titleMatch[2].trim();
    }
    // 兜底：URL slug
    if (!info.title) {
      const slugMatch = location.pathname.match(/\/problems\/([^/]+)/);
      if (slugMatch) {
        info.title = slugMatch[1]
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }

    // ── 难度 ──
    const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
    const colorSelectors = [
      '.text-difficulty-easy', '.text-difficulty-medium', '.text-difficulty-hard',
    ];
    for (const sel of colorSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const t = el.textContent.trim();
        if (DIFFICULTIES.includes(t)) { info.difficulty = t; break; }
      }
    }
    if (!info.difficulty) {
      const container =
        document.querySelector('[data-track-load="description_content"]') ||
        document.querySelector('[class*="description"]') ||
        document.body;
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (DIFFICULTIES.includes(t)) { info.difficulty = t; break; }
      }
    }

    // ── 分类 ──
    const categoryLinks = document.querySelectorAll(
      'a[href*="/problemset/"], a[href*="/tag/"]'
    );
    for (const link of categoryLinks) {
      const t = link.textContent.trim();
      if (isValidCategory(t)) { info.category = t; break; }
    }

    if (!info.category) {
      const topNav = document.querySelector(
        'nav, [class*="problem-list-nav"], [class*="header"], [class*="topbar"]'
      );
      if (topNav) {
        const leafNodes = Array.from(topNav.querySelectorAll('*'))
          .filter((el) => el.children.length === 0);
        for (const el of leafNodes) {
          const t = el.textContent.trim();
          if (isValidCategory(t)) { info.category = t; break; }
        }
      }
    }

    if (!info.category) {
      const tagLink = document.querySelector('a[href*="/tag/"]');
      if (tagLink) {
        const t = tagLink.textContent.trim();
        if (isValidCategory(t)) info.category = t;
      }
    }

    if (!isValidCategory(info.category)) info.category = null;

    return info;
  }

  // ─── 等待 Accepted ───────────────────────────────────────────────────────────

  function watchForAccepted(onAccepted) {
    let triggered = false;

    function check() {
      if (triggered) return;
      const resultEl = document.querySelector('[data-e2e-locator="submission-result"]');
      if (resultEl) {
        const text = resultEl.textContent.trim();
        if (text === 'Accepted') { trigger(); return; }
        if (text && text !== '') { stop(); return; }
      }
      const greenEls = document.querySelectorAll('.text-green-s, [class*="text-green"]');
      for (const el of greenEls) {
        if (el.textContent.trim() === 'Accepted' && el.children.length === 0) {
          trigger(); return;
        }
      }
    }

    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timeout = setTimeout(stop, 60_000);

    function trigger() { triggered = true; stop(); onAccepted(); }
    function stop()    { observer.disconnect(); clearTimeout(timeout); }
  }

  // ─── 保存（同天同题只保留最新记录，并更新间隔复习计划）──────────────────────────

  function saveSubmission(info) {
    chrome.storage.local.get(['submissions', 'reviewSchedule'], (result) => {
      let submissions    = result.submissions    || [];
      let reviewSchedule = result.reviewSchedule || {};

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTs = todayStart.getTime();

      // ── 更新间隔复习计划 ──
      const existing = reviewSchedule[info.title];
      let isReview = false;
      let newReviewCount = 0;

      if (existing) {
        const now = Date.now();
        const isDue = now >= existing.nextReviewAt; // 只有到了复习时间才算有效复习

        if (isDue) {
          // 到了复习窗口 → 算一次有效复习，递增计数
          isReview = true;
          newReviewCount = existing.reviewCount + 1;
          const intervalMs = getNextIntervalMs(newReviewCount);
          reviewSchedule[info.title] = {
            reviewCount:    newReviewCount,
            firstSolvedAt:  existing.firstSolvedAt,
            lastReviewedAt: todayTs,
            nextReviewAt:   todayTs + intervalMs,
            difficulty:     info.difficulty || existing.difficulty,
            category:       info.category   || existing.category,
          };
        } else {
          // 未到复习窗口 → 不计入复习，保持原计划不变
          reviewSchedule[info.title] = {
            ...existing,
            difficulty: info.difficulty || existing.difficulty,
            category:   info.category   || existing.category,
          };
        }
      } else {
        // 全新题目 → 第一次刷，1天后提醒复习
        reviewSchedule[info.title] = {
          reviewCount:    0,
          firstSolvedAt:  todayTs,
          lastReviewedAt: todayTs,
          nextReviewAt:   todayTs + getNextIntervalMs(0),   // +1天
          difficulty:     info.difficulty,
          category:       info.category,
        };
      }

      // ── 去重：同天同题只保留最新 ──
      submissions = submissions.filter(
        (s) => !(s.title === info.title && s.timestamp >= todayTs)
      );
      submissions.push(info);

      chrome.storage.local.set({ submissions, reviewSchedule }, () => {
        console.log('[LeetCode Tracker] ✅ 已保存:', info, reviewSchedule[info.title]);

        if (isReview) {
          const intervalDays = REVIEW_INTERVALS_DAYS[
            Math.min(newReviewCount, REVIEW_INTERVALS_DAYS.length - 1)
          ];
          const nextDate = new Date(todayTs + intervalDays * 86_400_000);
          const nd = String(nextDate.getDate()).padStart(2,'0');
          const nm = String(nextDate.getMonth()+1).padStart(2,'0');
          const ny = nextDate.getFullYear();
          showToast(`🔁 复习完成（第${newReviewCount}次），下次复习时间 ${nd}/${nm}/${ny}`);
        } else if (existing) {
          showToast(`✅ 已记录：${info.title}（复习计划未变）`);
        } else {
          showToast(`✅ 已记录：${info.title} — 明天记得复习哟`);
        }
      });
    });
  }

  function showToast(message) {
    document.getElementById('lc-tracker-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'lc-tracker-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed', top: '60px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '2147483647',
      background: '#16a34a', color: '#fff', padding: '10px 20px',
      borderRadius: '24px', fontSize: '14px', fontWeight: '600',
      fontFamily: 'system-ui, sans-serif', boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      opacity: '1', transition: 'opacity 0.4s ease', pointerEvents: 'none',
      whiteSpace: 'nowrap',
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // ─── 监听 Submit ─────────────────────────────────────────────────────────────

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const isSubmit =
      btn.getAttribute('data-e2e-locator') === 'console-submit-button' ||
      btn.textContent.trim() === 'Submit';
    if (!isSubmit) return;

    console.log('[LeetCode Tracker] Submit 点击，监控中...');
    setTimeout(() => {
      watchForAccepted(() => {
        const info = extractProblemInfo();
        if (info.title) saveSubmission(info);
      });
    }, 800);
  }, true);

  console.log('[LeetCode Tracker] v1.3 已加载 ✓');
})();
