trackVisit();

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const logoutBtn = document.getElementById('logoutBtn');
const courseForm = document.getElementById('courseForm');
const courseMessage = document.getElementById('courseMessage');
const categoryForm = document.getElementById('categoryForm');
const categoryMessage = document.getElementById('categoryMessage');
const refreshLeadsBtn = document.getElementById('refreshLeadsBtn');
const refreshStatsBtn = document.getElementById('refreshStatsBtn');
const newCourseBtn = document.getElementById('newCourseBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const leadSearchInput = document.getElementById('leadSearchInput');
const leadCourseFilter = document.getElementById('leadCourseFilter');
const leadsTableBody = document.getElementById('leadsTableBody');
const coursesTableBody = document.getElementById('coursesTableBody');
const categoriesList = document.getElementById('categoriesList');
const leadsEmpty = document.getElementById('leadsEmpty');
const coursesEmpty = document.getElementById('coursesEmpty');
const courseCategoryInput = document.getElementById('courseCategoryInput');
const analyticsMessage = document.getElementById('analyticsMessage');

let coursesCache = [];
let categoriesCache = [];
let searchTimer = null;
let dailyLeadsChart = null;
let courseStatsChart = null;

async function trackVisit() {
  try {
    await fetch('/api/visit');
  } catch (error) {
    console.warn('Visit tracking failed');
  }
}

function setMessage(element, message, type) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = `form-message ${type || ''}`.trim();
}

function isLoggedIn() {
  return sessionStorage.getItem('admission_admin_logged_in') === 'true';
}

function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  loadStats();
  loadCategories();
  loadCourses();
  loadLeads();
}

function showLogin() {
  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value.trim(),
  };

  setMessage(loginMessage, 'Checking login...', '');

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    sessionStorage.setItem('admission_admin_logged_in', 'true');
    loginForm.reset();
    setMessage(loginMessage, '', '');
    showDashboard();
  } catch (error) {
    setMessage(loginMessage, error.message, 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('admission_admin_logged_in');
  showLogin();
});

document.querySelectorAll('.sidebar-link').forEach((button) => {
  button.addEventListener('click', () => openPanel(button.dataset.target));
});

document.querySelectorAll('[data-open-panel]').forEach((button) => {
  button.addEventListener('click', () => openPanel(button.dataset.openPanel));
});

function openPanel(target) {
  document.querySelectorAll('.sidebar-link').forEach((item) => item.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach((panel) => panel.classList.remove('active-panel'));

  const sidebarButton = document.querySelector(`.sidebar-link[data-target="${target}"]`);
  const panel = document.getElementById(target);

  if (sidebarButton) {
    sidebarButton.classList.add('active');
  }

  if (panel) {
    panel.classList.add('active-panel');
  }
}

async function loadStats() {
  setMessage(analyticsMessage, 'Loading analytics...', '');

  try {
    const response = await fetch('/api/admin/stats');
    const stats = await response.json();

    if (!response.ok) {
      throw new Error(stats.message || 'Unable to load stats.');
    }

    updateStatCards(stats);
    renderCharts(stats);
    setMessage(analyticsMessage, '', '');
  } catch (error) {
    updateStatCards({ totalVisitors: 0, totalLeads: 0, totalCourses: 0, dailyLeads: [], courseStats: [] });
    renderCharts({ dailyLeads: [], courseStats: [] });
    setMessage(analyticsMessage, error.message || 'Unable to load analytics.', 'error');
  }
}

function updateStatCards(stats) {
  document.getElementById('totalVisitors').textContent = stats.totalVisitors || 0;
  document.getElementById('totalLeads').textContent = stats.totalLeads || 0;
  document.getElementById('totalCourses').textContent = stats.totalCourses || 0;
  document.getElementById('analyticsTotalVisitors').textContent = stats.totalVisitors || 0;
  document.getElementById('analyticsTotalLeads').textContent = stats.totalLeads || 0;
  document.getElementById('analyticsTotalCourses').textContent = stats.totalCourses || 0;
}

function renderCharts(stats) {
  if (typeof Chart === 'undefined') {
    setMessage(analyticsMessage, 'Charts could not be loaded. Please check your internet connection and refresh.', 'error');
    return;
  }

  renderDailyLeadsChart(stats.dailyLeads || []);
  renderCourseStatsChart(stats.courseStats || []);
}

function renderDailyLeadsChart(dailyLeads) {
  const canvas = document.getElementById('dailyLeadsChart');
  const labels = dailyLeads.map((item) => item.date);
  const values = dailyLeads.map((item) => item.count);

  if (dailyLeadsChart) {
    dailyLeadsChart.destroy();
  }

  dailyLeadsChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Daily Leads',
          data: values,
          borderColor: '#6ce5c6',
          backgroundColor: 'rgba(108, 229, 198, 0.18)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    },
    options: getChartOptions('Leads'),
  });
}

function renderCourseStatsChart(courseStats) {
  const canvas = document.getElementById('courseStatsChart');
  const labels = courseStats.length ? courseStats.map((item) => item.course || 'Unknown') : ['No leads yet'];
  const values = courseStats.length ? courseStats.map((item) => item.count) : [0];

  if (courseStatsChart) {
    courseStatsChart.destroy();
  }

  courseStatsChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Course Leads',
          data: values,
          backgroundColor: ['#7c8cff', '#6ce5c6', '#ffd166', '#ff8fab', '#b9fbc0'],
          borderRadius: 12,
        },
      ],
    },
    options: getChartOptions('Leads'),
  });
}

function getChartOptions(axisLabel) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: { color: '#dce7fa', font: { weight: 'bold' } },
      },
    },
    scales: {
      x: {
        ticks: { color: '#93a4bd', maxRotation: 45, minRotation: 0 },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#93a4bd', precision: 0 },
        title: { display: true, text: axisLabel, color: '#93a4bd' },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
      },
    },
  };
}

async function loadLeads() {
  const query = new URLSearchParams();
  const search = leadSearchInput.value.trim();
  const course = leadCourseFilter.value;

  if (search) {
    query.set('search', search);
  }

  if (course) {
    query.set('course', course);
  }

  leadsTableBody.innerHTML = '<tr><td colspan="7">Loading leads...</td></tr>';
  leadsEmpty.classList.add('hidden');

  try {
    const response = await fetch(`/api/leads?${query.toString()}`);
    const leads = await response.json();

    if (!response.ok) {
      throw new Error(leads.message || 'Unable to load leads.');
    }

    if (!leads.length) {
      leadsTableBody.innerHTML = '';
      leadsEmpty.classList.remove('hidden');
      return;
    }

    leadsTableBody.innerHTML = leads
      .map(
        (lead) => `
          <tr>
            <td>${escapeHtml(lead.name)}</td>
            <td>${escapeHtml(lead.mobile)}</td>
            <td>${escapeHtml(lead.course)}</td>
            <td>${escapeHtml(lead.city)}</td>
            <td>${escapeHtml(lead.ip || 'Unknown')}</td>
            <td>${formatDate(lead.createdAt)}</td>
            <td><button class="action-btn danger" type="button" onclick="deleteLead('${lead._id}')">Delete</button></td>
          </tr>
        `
      )
      .join('');
  } catch (error) {
    leadsTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function deleteLead(id) {
  if (!window.confirm('Delete this lead permanently?')) {
    return;
  }

  try {
    const response = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to delete lead.');
    }

    await loadLeads();
    await loadStats();
  } catch (error) {
    window.alert(error.message);
  }
}

async function loadCourses() {
  coursesTableBody.innerHTML = '<tr><td colspan="4">Loading courses...</td></tr>';
  coursesEmpty.classList.add('hidden');

  try {
    const response = await fetch('/api/course');
    const courses = await response.json();

    if (!response.ok) {
      throw new Error(courses.message || 'Unable to load courses.');
    }

    coursesCache = courses;
    renderLeadCourseFilter();

    if (!courses.length) {
      coursesTableBody.innerHTML = '';
      coursesEmpty.classList.remove('hidden');
      return;
    }

    coursesTableBody.innerHTML = courses
      .map(
        (course) => `
          <tr>
            <td>${escapeHtml(course.title)}</td>
            <td>${escapeHtml(course.category || 'General')}</td>
            <td>${escapeHtml(course.slug)}</td>
            <td class="table-actions">
              <button class="action-btn" type="button" onclick="editCourse('${course._id}')">Edit</button>
              <button class="action-btn danger" type="button" onclick="deleteCourse('${course._id}')">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');
  } catch (error) {
    coursesTableBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function addCourse() {
  return saveCourse('POST', '/api/course/add', 'Course added successfully.');
}

async function updateCourse() {
  const id = document.getElementById('courseIdInput').value;
  return saveCourse('PUT', `/api/course/${id}`, 'Course updated successfully.');
}

async function saveCourse(method, url, successMessage) {
  const payload = {
    title: document.getElementById('courseTitleInput').value.trim(),
    slug: document.getElementById('courseSlugInput').value.trim(),
    category: courseCategoryInput.value,
    description: document.getElementById('courseDescriptionInput').value.trim(),
    keywords: document.getElementById('courseKeywordsInput').value.trim(),
    content: document.getElementById('courseContentInput').value.trim(),
  };

  setMessage(courseMessage, 'Saving course...', '');

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to save course.');
    }

    resetCourseForm();
    setMessage(courseMessage, data.message || successMessage, 'success');
    await loadCourses();
    await loadStats();
  } catch (error) {
    setMessage(courseMessage, error.message, 'error');
  }
}

async function deleteCourse(id) {
  if (!window.confirm('Delete this course permanently?')) {
    return;
  }

  try {
    const response = await fetch(`/api/course/${id}`, { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to delete course.');
    }

    await loadCourses();
    await loadStats();
  } catch (error) {
    window.alert(error.message);
  }
}

function editCourse(id) {
  const course = coursesCache.find((item) => item._id === id);

  if (!course) {
    return;
  }

  document.getElementById('courseIdInput').value = course._id;
  document.getElementById('courseTitleInput').value = course.title;
  document.getElementById('courseSlugInput').value = course.slug;
  document.getElementById('courseDescriptionInput').value = course.description;
  document.getElementById('courseKeywordsInput').value = Array.isArray(course.keywords) ? course.keywords.join(', ') : course.keywords || '';
  document.getElementById('courseContentInput').value = course.content;
  courseCategoryInput.value = course.category || 'General';
  document.getElementById('courseFormTitle').textContent = 'Edit course';
  document.getElementById('saveCourseBtn').textContent = 'Update Course';
  cancelEditBtn.classList.remove('hidden');
  openPanel('coursesPanel');
}

function resetCourseForm() {
  courseForm.reset();
  document.getElementById('courseIdInput').value = '';
  document.getElementById('courseFormTitle').textContent = 'Add course';
  document.getElementById('saveCourseBtn').textContent = 'Save Course';
  cancelEditBtn.classList.add('hidden');
  courseCategoryInput.value = 'General';
}

courseForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!isLoggedIn()) {
    showLogin();
    return;
  }

  if (document.getElementById('courseIdInput').value) {
    await updateCourse();
  } else {
    await addCourse();
  }
});

newCourseBtn.addEventListener('click', () => {
  resetCourseForm();
  setMessage(courseMessage, '', '');
});

cancelEditBtn.addEventListener('click', () => {
  resetCourseForm();
  setMessage(courseMessage, 'Edit cancelled.', '');
});

async function loadCategories() {
  categoriesList.innerHTML = '<div class="empty-state">Loading categories...</div>';

  try {
    const response = await fetch('/api/categories');
    const categories = await response.json();

    if (!response.ok) {
      throw new Error(categories.message || 'Unable to load categories.');
    }

    categoriesCache = categories;
    renderCategories();
    renderCategorySelect();
  } catch (error) {
    categoriesList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function renderCategories() {
  if (!categoriesCache.length) {
    categoriesList.innerHTML = '<div class="empty-state">No categories found.</div>';
    return;
  }

  categoriesList.innerHTML = categoriesCache
    .map(
      (category) => `
        <div class="category-pill-row">
          <span>${escapeHtml(category.name)}</span>
          <button class="action-btn danger" type="button" onclick="deleteCategory('${category._id}')">Delete</button>
        </div>
      `
    )
    .join('');
}

function renderCategorySelect() {
  const options = ['General', ...categoriesCache.map((category) => category.name)];
  const currentValue = courseCategoryInput.value || 'General';
  courseCategoryInput.innerHTML = options
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join('');
  courseCategoryInput.value = options.includes(currentValue) ? currentValue : 'General';
}

function renderLeadCourseFilter() {
  const currentValue = leadCourseFilter.value;
  leadCourseFilter.innerHTML = '<option value="">All courses</option>' + coursesCache
    .map((course) => `<option value="${escapeHtml(course.title)}">${escapeHtml(course.title)}</option>`)
    .join('');
  leadCourseFilter.value = currentValue;
}

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('categoryNameInput').value.trim();
  setMessage(categoryMessage, 'Saving category...', '');

  try {
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to save category.');
    }

    categoryForm.reset();
    setMessage(categoryMessage, data.message, 'success');
    await loadCategories();
  } catch (error) {
    setMessage(categoryMessage, error.message, 'error');
  }
});

async function deleteCategory(id) {
  if (!window.confirm('Delete this category? Courses using it will move to General.')) {
    return;
  }

  try {
    const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to delete category.');
    }

    await loadCategories();
    await loadCourses();
  } catch (error) {
    window.alert(error.message);
  }
}

refreshLeadsBtn.addEventListener('click', loadLeads);
refreshStatsBtn.addEventListener('click', loadStats);
leadCourseFilter.addEventListener('change', loadLeads);
leadSearchInput.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(loadLeads, 250);
});

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.loadStats = loadStats;
window.loadLeads = loadLeads;
window.deleteLead = deleteLead;
window.addCourse = addCourse;
window.updateCourse = updateCourse;
window.deleteCourse = deleteCourse;
window.editCourse = editCourse;
window.deleteCategory = deleteCategory;

if (isLoggedIn()) {
  showDashboard();
} else {
  showLogin();
}
