trackVisit();

const fallbackCourses = [
  {
    title: 'B.Tech Admission in MP',
    slug: 'btech-admission-mp',
    category: 'Engineering',
    description: 'Engineering admission support for branches, counseling, eligibility and college selection.',
  },
  {
    title: 'GNM Nursing Admission',
    slug: 'gnm-nursing-admission',
    category: 'Medical',
    description: 'Nursing admission guidance for healthcare-focused students and career starters.',
  },
  {
    title: 'MBA Admission Guidance',
    slug: 'mba-admission-guidance',
    category: 'Management',
    description: 'Management admission support with specialization, fees and placement guidance.',
  },
  {
    title: 'BCA Admission',
    slug: 'bca-admission',
    category: 'IT / Computer',
    description: 'Computer applications admission guidance for students entering the IT field.',
  },
];

const homeCategories = [
  {
    title: 'Medical',
    description: 'Nursing, paramedical, healthcare, and clinical career admission guidance.',
    image: makeCategoryImage('Medical', '#6ce5c6', '#123a35'),
  },
  {
    title: 'Management',
    description: 'MBA and business program counseling for career-focused graduates.',
    image: makeCategoryImage('Management', '#ffd166', '#3a2d12'),
  },
  {
    title: 'Engineering',
    description: 'B.Tech branch selection, counseling, eligibility, and college support.',
    image: makeCategoryImage('Engineering', '#7c8cff', '#181f4a'),
  },
  {
    title: 'IT / Computer',
    description: 'BCA and computer application admissions for future technology careers.',
    image: makeCategoryImage('IT', '#ff8fab', '#3f1423'),
  },
];

const courseCards = document.getElementById('courseCards');
const categoryCards = document.getElementById('categoryCards');
const popupOverlay = document.getElementById('popupOverlay');
const popupForm = document.getElementById('popupForm');
const closePopupBtn = document.getElementById('closePopupBtn');
const popupMessage = document.getElementById('popupMessage');
const popupCourse = document.getElementById('popupCourse');

async function trackVisit() {
  try {
    await fetch('/api/visit');
  } catch (error) {
    console.warn('Visit tracking failed');
  }
}

function makeCategoryImage(label, accent, base) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${accent}" stop-opacity="0.9"/>
          <stop offset="1" stop-color="${base}" stop-opacity="1"/>
        </linearGradient>
        <radialGradient id="r" cx="80%" cy="20%" r="65%">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="420" rx="46" fill="url(#g)"/>
      <rect width="640" height="420" rx="46" fill="url(#r)"/>
      <circle cx="510" cy="92" r="80" fill="#ffffff" opacity="0.16"/>
      <circle cx="112" cy="330" r="118" fill="#000000" opacity="0.18"/>
      <path d="M155 236h330v36H155zM196 168h248v36H196zM236 100h168v36H236z" fill="#ffffff" opacity="0.82"/>
      <text x="52" y="370" font-family="Arial, sans-serif" font-size="58" font-weight="800" fill="#ffffff">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function loadHomeCourses() {
  if (!courseCards) {
    return;
  }

  try {
    const response = await fetch('/api/course');
    const courses = await response.json();

    if (!response.ok) {
      throw new Error('Unable to load courses.');
    }

    renderCourseCards(courses.length ? courses : fallbackCourses);
  } catch (error) {
    renderCourseCards(fallbackCourses);
  }
}

function renderCourseCards(courses) {
  courseCards.innerHTML = courses
    .map(
      (course, index) => `
        <a class="course-card reveal delay-${index > 2 ? 2 : index}" href="/course/${encodeURIComponent(course.slug)}">
          <div>
            <p class="eyebrow">${escapeHtml(course.category || 'Admission')}</p>
            <h3>${escapeHtml(course.title)}</h3>
            <p>${escapeHtml(course.description)}</p>
          </div>
          <span class="card-link">View course</span>
        </a>
      `
    )
    .join('');
}

function renderCategoryCards() {
  if (!categoryCards) {
    return;
  }

  categoryCards.innerHTML = homeCategories
    .map(
      (category, index) => `
        <button class="category-home-card reveal delay-${index > 2 ? 2 : index}" type="button" onclick="openForm('${escapeAttribute(category.title)}')">
          <img src="${category.image}" alt="${escapeAttribute(category.title)} admission category">
          <span>${escapeHtml(category.title)}</span>
          <p>${escapeHtml(category.description)}</p>
        </button>
      `
    )
    .join('');
}

function openForm(courseName) {
  popupCourse.value = courseName;
  popupMessage.textContent = '';
  popupMessage.className = 'form-message';
  popupOverlay.classList.remove('hidden');
  popupOverlay.setAttribute('aria-hidden', 'false');
  document.getElementById('popupName').focus();
}

function closeForm() {
  popupOverlay.classList.add('hidden');
  popupOverlay.setAttribute('aria-hidden', 'true');
  popupForm.reset();
}

function setPopupMessage(message, type) {
  popupMessage.textContent = message;
  popupMessage.className = `form-message ${type || ''}`.trim();
}

popupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById('popupName').value.trim(),
    mobile: document.getElementById('popupMobile').value.trim(),
    city: document.getElementById('popupCity').value.trim(),
    course: popupCourse.value.trim(),
  };

  setPopupMessage('Submitting your inquiry...', '');

  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to submit inquiry.');
    }

    popupForm.reset();
    popupCourse.value = payload.course;
    setPopupMessage(data.message, 'success');
  } catch (error) {
    setPopupMessage(error.message, 'error');
  }
});

closePopupBtn.addEventListener('click', closeForm);

popupOverlay.addEventListener('click', (event) => {
  if (event.target === popupOverlay) {
    closeForm();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !popupOverlay.classList.contains('hidden')) {
    closeForm();
  }
});

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

window.openForm = openForm;

renderCategoryCards();
loadHomeCourses();
