trackVisit();

const params = new URLSearchParams(window.location.search);
const pathSegments = window.location.pathname.split('/').filter(Boolean);
const pathSlug = pathSegments[0] === 'course' ? pathSegments[1] : '';
const slug = pathSlug || params.get('slug');

const courseTitle = document.getElementById('courseTitle');
const courseDescription = document.getElementById('courseDescription');
const courseContent = document.getElementById('courseContent');
const courseInput = document.getElementById('course');
const applyForm = document.getElementById('applyForm');
const formMessage = document.getElementById('formMessage');
const relatedCoursesSection = document.getElementById('relatedCoursesSection');
const relatedCourses = document.getElementById('relatedCourses');

let activeCourse = null;

async function trackVisit() {
  try {
    await fetch('/api/visit');
  } catch (error) {
    console.warn('Visit tracking failed');
  }
}

function setMessage(element, message, type) {
  element.textContent = message;
  element.className = `form-message ${type || ''}`.trim();
}

function updateMeta(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content || '');
}

async function loadCourse() {
  if (!slug) {
    showCourseNotFound('Please open this page from a course card on the home page.');
    return;
  }

  try {
    const response = await fetch(`/api/course/${encodeURIComponent(slug)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Course not found.');
    }

    activeCourse = data;
    courseTitle.textContent = data.title;
    courseDescription.textContent = data.description;
    courseContent.innerHTML = buildSeoContent(data);
    courseInput.value = data.title;
    applyForm.classList.remove('hidden');

    document.title = `${data.title} | AdmissionPro`;
    updateMeta('description', data.description);
    updateMeta('keywords', Array.isArray(data.keywords) ? data.keywords.join(', ') : data.keywords || '');
    await loadRelatedCourses(data.slug);
  } catch (error) {
    showCourseNotFound(error.message);
  }
}

function buildSeoContent(course) {
  const content = String(course.content || '');
  const requiredSections = ['Admission', 'Eligibility', 'Fees', 'Colleges', 'Placement'];
  const missingSections = requiredSections.filter((section) => {
    const pattern = new RegExp(`<h2[^>]*>\\s*${section}\\s*</h2>`, 'i');
    return !pattern.test(content);
  });

  if (!missingSections.length) {
    return content;
  }

  const generatedSections = missingSections
    .map((section) => `<h2>${section}</h2><p>${getSectionFallback(course, section)}</p>`)
    .join('');

  return `${content}${generatedSections}`;
}

function getSectionFallback(course, section) {
  const title = course.title || 'this course';
  const fallbacks = {
    Admission: `Get complete admission guidance for ${title}, including application support, counseling help, and document assistance.`,
    Eligibility: `Eligibility requirements for ${title} may vary by college and university rules. Our counselors help verify the latest criteria before application.`,
    Fees: `Fees for ${title} depend on college, seat type, scholarship availability, hostel, and other facilities.`,
    Colleges: `We help compare suitable colleges for ${title} based on approvals, location, facilities, academics, and admission availability.`,
    Placement: `Placement support and career outcomes depend on the selected college, student skills, internships, and industry exposure.`,
  };

  return fallbacks[section] || `Learn more about ${title}.`;
}

async function loadRelatedCourses(currentSlug) {
  if (!relatedCoursesSection || !relatedCourses) {
    return;
  }

  relatedCoursesSection.classList.add('hidden');
  relatedCourses.innerHTML = '';

  try {
    const response = await fetch('/api/course');
    const courses = await response.json();

    if (!response.ok) {
      throw new Error(courses.message || 'Unable to load related courses.');
    }

    const matches = courses.filter((course) => course.slug !== currentSlug).slice(0, 4);

    if (!matches.length) {
      return;
    }

    relatedCourses.innerHTML = matches
      .map(
        (course) => `
          <a class="related-course-link" href="/course/${encodeURIComponent(course.slug)}">
            <span>${escapeHtml(course.title)}</span>
            <small>${escapeHtml(course.category || 'Admission')}</small>
          </a>
        `
      )
      .join('');
    relatedCoursesSection.classList.remove('hidden');
  } catch (error) {
    relatedCoursesSection.classList.add('hidden');
  }
}

function showCourseNotFound(message) {
  activeCourse = null;
  courseTitle.textContent = 'Course Not Found';
  courseDescription.textContent = message || 'The course you are looking for is not available.';
  courseContent.innerHTML = '<p>Please return to the courses page and choose another admission program.</p>';
  courseInput.value = '';
  applyForm.classList.add('hidden');
  if (relatedCoursesSection) {
    relatedCoursesSection.classList.add('hidden');
  }
  document.title = 'Course Not Found | AdmissionPro';
  updateMeta('description', 'Course not found. Please choose another course from AdmissionPro.');
  updateMeta('keywords', 'course not found, admission guidance');
}

applyForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!activeCourse) {
    setMessage(formMessage, 'Please wait until the course details finish loading.', 'error');
    return;
  }

  const payload = {
    name: document.getElementById('name').value.trim(),
    mobile: document.getElementById('mobile').value.trim(),
    city: document.getElementById('city').value.trim(),
    course: courseInput.value.trim(),
  };

  setMessage(formMessage, 'Submitting your application...', '');

  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to submit application.');
    }

    applyForm.reset();
    courseInput.value = activeCourse.title;
    setMessage(formMessage, data.message, 'success');
  } catch (error) {
    setMessage(formMessage, error.message, 'error');
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

loadCourse();
