require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Course = require('./models/Course');
const Category = require('./models/Category');
const Visitor = require('./models/Visitor');
const leadRoutes = require('./routes/leads');
const courseRoutes = require('./routes/course');
const adminRoutes = require('./routes/admin');
const categoryRoutes = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not set");
  process.exit(1);
}
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/leads', leadRoutes);
app.use('/api/course', courseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip ||
    'Unknown'
  );
}

app.get('/api/visit', async (req, res) => {
  try {
    const visitor = await Visitor.create({
      ip: getClientIp(req),
      date: new Date(),
      userAgent: req.headers['user-agent'] || '',
    });

    return res.json({ message: 'Visit tracked successfully.', visitor });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to track visitor.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/course/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'course.html'));
});

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getSiteUrl(req) {
  return (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

app.get('/sitemap.xml', async (req, res) => {
  try {
    const siteUrl = getSiteUrl(req);
    const courses = await Course.find().select('slug updatedAt').sort({ updatedAt: -1 });
    const urls = [
      {
        loc: `${siteUrl}/`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: '1.0',
      },
      ...courses.map((course) => ({
        loc: `${siteUrl}/course/${course.slug}`,
        lastmod: (course.updatedAt || new Date()).toISOString(),
        changefreq: 'weekly',
        priority: '0.8',
      })),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.type('application/xml');
    return res.send(xml);
  } catch (error) {
    return res.status(500).type('text/plain').send('Unable to generate sitemap.');
  }
});

app.get('/robots.txt', (req, res) => {
  const siteUrl = getSiteUrl(req);
  res.type('text/plain');
  return res.send(`User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'education-admission-website' });
});

const defaultCategories = ['Medical', 'Management', 'Engineering', 'IT / Computer'];

const defaultCourses = [
  {
    title: 'B.Tech Admission in MP',
    slug: 'btech-admission-mp',
    category: 'Engineering',
    description: 'Explore engineering admission options, eligibility, branches, counseling guidance, and college selection support across Madhya Pradesh.',
    keywords: ['B.Tech admission MP', 'engineering admission', 'college counseling', 'direct admission B.Tech'],
    content: `
      <h2>Admission</h2>
      <p>B.Tech is one of the most preferred professional courses for students who want to build a career in engineering, technology, software, manufacturing, electronics, civil infrastructure, and emerging technical fields.</p>
      <h2>Eligibility</h2>
      <p>Students should have completed 10+2 with Physics, Chemistry, and Mathematics from a recognized board. Admission may be based on entrance exam scores, counseling, institute-level seats, or direct admission rules depending on the college.</p>
      <h2>Fees</h2>
      <p>B.Tech fees vary by college, branch, scholarship, and seat type. Our team helps students compare fee structures before applying.</p>
      <h2>Colleges</h2>
      <p>We help students shortlist suitable engineering colleges across Madhya Pradesh based on branch availability, approvals, location, facilities, and placement records.</p>
      <ul>
        <li>Computer Science Engineering</li>
        <li>Artificial Intelligence and Data Science</li>
        <li>Mechanical Engineering</li>
        <li>Civil Engineering</li>
        <li>Electronics and Communication Engineering</li>
      </ul>
      <h2>Placement</h2>
      <p>Our counselors help students compare colleges, understand fees, review placement records, choose the right branch, and complete application formalities on time.</p>
    `,
  },
  {
    title: 'GNM Nursing Admission',
    slug: 'gnm-nursing-admission',
    category: 'Medical',
    description: 'Get complete support for GNM nursing admission, eligibility, college shortlisting, documentation, and counseling assistance.',
    keywords: ['GNM nursing admission', 'nursing college admission', 'medical course guidance', 'healthcare admission'],
    content: `
      <h2>Admission</h2>
      <p>General Nursing and Midwifery is a practical healthcare program for students who want to work in hospitals, clinics, community health centers, and patient care services.</p>
      <h2>Eligibility</h2>
      <p>Students who have completed 10+2 from a recognized board can apply. Eligibility may vary by institute and state rules, so students should verify current admission guidelines before applying.</p>
      <h2>Fees</h2>
      <p>GNM nursing fees depend on college type, facilities, clinical training, hostel, and scholarship options.</p>
      <h2>Colleges</h2>
      <p>We help students compare nursing colleges, clinical exposure, seat availability, approvals, and documentation requirements.</p>
      <h2>Placement</h2>
      <ul>
        <li>Staff Nurse</li>
        <li>Community Health Worker</li>
        <li>Clinical Assistant</li>
        <li>Hospital Ward Supervisor</li>
        <li>Further studies in nursing and healthcare</li>
      </ul>
      <p>We guide students through college selection, seat availability, fee details, document preparation, and application submission.</p>
    `,
  },
  {
    title: 'MBA Admission Guidance',
    slug: 'mba-admission-guidance',
    category: 'Management',
    description: 'Find the right MBA college and specialization with expert guidance on eligibility, fees, placement records, and admission process.',
    keywords: ['MBA admission', 'management admission', 'MBA college guidance', 'business school admission'],
    content: `
      <h2>Admission</h2>
      <p>An MBA helps graduates move into management, leadership, consulting, finance, marketing, operations, analytics, and entrepreneurship roles.</p>
      <h2>Eligibility</h2>
      <p>Applicants generally need a graduation degree from a recognized university. Some colleges accept entrance exam scores while others may offer admission through merit, counseling, interview, or management quota as per policy.</p>
      <h2>Fees</h2>
      <p>MBA fees depend on college reputation, specialization, location, scholarship availability, and hostel or transport facilities.</p>
      <h2>Colleges</h2>
      <p>We help students compare management colleges by specialization, faculty, internships, industry exposure, and placement support.</p>
      <ul>
        <li>Marketing Management</li>
        <li>Finance Management</li>
        <li>Human Resource Management</li>
        <li>Business Analytics</li>
        <li>International Business</li>
      </ul>
      <h2>Placement</h2>
      <p>We help students compare colleges, review placement support, understand fee structures, select specializations, and complete admission steps smoothly.</p>
    `,
  },
  {
    title: 'BCA Admission',
    slug: 'bca-admission',
    category: 'IT / Computer',
    description: 'Start your IT career with BCA admission guidance covering eligibility, colleges, fees, programming skills, and career options.',
    keywords: ['BCA admission', 'computer course admission', 'IT course guidance', 'software career admission'],
    content: `
      <h2>Admission</h2>
      <p>BCA is a strong undergraduate option for students interested in programming, application development, databases, web development, cybersecurity, and software careers.</p>
      <h2>Eligibility</h2>
      <p>Students who have completed 10+2 from a recognized board can apply. Mathematics or computer background may be preferred by some institutes, but requirements differ by college.</p>
      <h2>Fees</h2>
      <p>BCA fees vary by college, city, lab facilities, scholarship options, and university affiliation.</p>
      <h2>Colleges</h2>
      <p>We help students choose BCA colleges based on programming labs, faculty, internships, industry exposure, and career support.</p>
      <ul>
        <li>Programming fundamentals</li>
        <li>Web development</li>
        <li>Database management</li>
        <li>Computer networks</li>
        <li>Software engineering</li>
      </ul>
      <h2>Placement</h2>
      <p>BCA graduates can work as junior developers, support engineers, web developers, data assistants, or continue with MCA and other advanced IT programs.</p>
    `,
  },
];

async function seedCategories() {
  for (const name of defaultCategories) {
    await Category.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
}

async function seedCourses() {
  for (const course of defaultCourses) {
    await Course.findOneAndUpdate(
      { slug: course.slug },
      course,
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
}

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    await seedCategories();
    await seedCourses();
    app.listen(PORT, () => {
      console.info(`Education admission website running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
