// API base URL
const API_BASE = '/api';

// DOM elements
const monitorForm = document.getElementById('monitorForm');
const monitorsList = document.getElementById('monitorsList');
const refreshBtn = document.getElementById('refreshBtn');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadMonitors();

  monitorForm.addEventListener('submit', handleFormSubmit);
  refreshBtn.addEventListener('click', loadMonitors);
});

// Form submission
async function handleFormSubmit(e) {
  e.preventDefault();

  const formData = new FormData(monitorForm);
  const data = {
    url: formData.get('url'),
    interval: formData.get('interval'),
    slackWebhook: formData.get('slackWebhook') || 'console'
  };

  try {
    const response = await fetch(`${API_BASE}/monitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      showToast('모니터가 성공적으로 추가되었습니다! 🎉', 'success');
      monitorForm.reset();
      loadMonitors();
    } else {
      showToast(`오류: ${result.error}`, 'error');
    }
  } catch (error) {
    showToast(`네트워크 오류: ${error.message}`, 'error');
  }
}

// Load monitors
async function loadMonitors() {
  monitorsList.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>모니터 로딩 중...</p>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE}/monitors`);
    const result = await response.json();

    if (result.success) {
      displayMonitors(result.monitors);
    } else {
      showToast(`오류: ${result.error}`, 'error');
    }
  } catch (error) {
    monitorsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>모니터를 불러올 수 없습니다</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
      </div>
    `;
  }
}

// Display monitors
function displayMonitors(monitors) {
  if (monitors.length === 0) {
    monitorsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>활성 모니터가 없습니다</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">위 폼에서 새 모니터를 추가해보세요</p>
      </div>
    `;
    return;
  }

  monitorsList.innerHTML = monitors.map(monitor => `
    <div class="monitor-item" data-id="${monitor.id}">
      <div class="monitor-header">
        <div class="monitor-url">${escapeHtml(monitor.url)}</div>
        <div class="monitor-actions">
          <button class="btn btn-success btn-sm" onclick="checkMonitor(${monitor.id})">
            <span class="btn-icon">🔍</span>
            확인
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteMonitor(${monitor.id})">
            <span class="btn-icon">🗑️</span>
            삭제
          </button>
        </div>
      </div>
      
      <div class="monitor-info">
        <div class="info-item">
          <span class="info-label">업데이트 주기</span>
          <span class="info-value">${getIntervalLabel(monitor.interval)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">상태</span>
          <span class="badge badge-success">활성</span>
        </div>
        <div class="info-item">
          <span class="info-label">마지막 확인</span>
          <span class="info-value">${formatDate(monitor.last_check)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Slack 연동</span>
          <span class="info-value">${monitor.slack_webhook === 'console' ? '콘솔' : '✓ 연결됨'}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Delete monitor
async function deleteMonitor(id) {
  if (!confirm('이 모니터를 삭제하시겠습니까?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/monitors/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showToast('모니터가 삭제되었습니다', 'success');
      loadMonitors();
    } else {
      showToast(`오류: ${result.error}`, 'error');
    }
  } catch (error) {
    showToast(`네트워크 오류: ${error.message}`, 'error');
  }
}

// Check monitor manually
async function checkMonitor(id) {
  showToast('모니터 확인 중...', 'success');

  try {
    const response = await fetch(`${API_BASE}/monitors/${id}/check`, {
      method: 'POST'
    });

    const result = await response.json();

    if (result.success) {
      const { totalPosts, newPosts } = result.result;

      // Show popup if new posts found
      if (newPosts > 0 && result.result.newPostsData) {
        showNewPostsModal(result.result.newPostsData);
      }

      showToast(
        `확인 완료! 총 ${totalPosts}개 게시글 중 ${newPosts}개 신규 발견`,
        'success'
      );
      loadMonitors();
    } else {
      showToast(`오류: ${result.error}`, 'error');
    }
  } catch (error) {
    showToast(`네트워크 오류: ${error.message}`, 'error');
  }
}

// Utility functions
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function getIntervalLabel(interval) {
  const labels = {
    'hourly': '매시간',
    'daily': '매일',
    'weekly': '매주',
    'every-5-min': '5분마다'
  };
  return labels[interval] || interval;
}

function formatDate(dateString) {
  if (!dateString) return '아직 없음';

  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString('ko-KR');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Modal functions
function showNewPostsModal(posts) {
  const modal = document.getElementById('newPostsModal');
  const postList = document.getElementById('modalPostList');

  postList.innerHTML = posts.map((post, index) => `
    <div class="post-item">
      <span class="post-number">#${index + 1}</span>
      <div class="post-title">${escapeHtml(post.title)}</div>
      <a href="${escapeHtml(post.link)}" target="_blank" class="post-link">
        ${escapeHtml(post.link)}
      </a>
    </div>
  `).join('');

  modal.classList.add('show');

  // Close on overlay click
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };
}

function closeModal() {
  const modal = document.getElementById('newPostsModal');
  modal.classList.remove('show');
}
