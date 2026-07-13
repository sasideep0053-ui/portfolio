export const RESUME = {
  name: 'Sasideep Kakumani',
  initials: 'SK',
  title: 'Frontend Engineer · Data Visualization & Analytics',
  subtitle: 'Real-Time Systems · Enterprise UI · Accessibility',
  location: 'Bay Area, CA',
  timezone: 'PT (UTC−8)',
  email: 'sasideep.sd53@gmail.com',
  phone: '(510) 320-4310',
  resumePdf: '/resume.pdf',

  stack: ['React', 'TypeScript', 'Data Visualization', 'Python', 'SQL'],

  stats: [
    { value: '10+', label: 'Years Experience' },
    { value: '10+', label: 'Apps Shipped' },
    { value: '60K+', label: 'Daily Users' },
  ],

  builds: [
    {
      title: 'Report Studio',
      tag: 'Dashboard Builder',
      line: 'Drag-and-resize dashboard builder — now embedded across multiple internal teams.',
    },
    {
      title: 'AI Assistant Pilot',
      tag: 'LLM · Real-Time',
      line: 'Internal pilot with real-time LLM token streaming over SSE, integrated into the analytics platform.',
    },
  ],

  skillTiers: [
    {
      level: 'Core Skillset',
      description: '',
      items: ['TypeScript', 'React', 'Redux Toolkit', 'D3.js', 'AG Grid', 'CSS / LESS / SASS', 'Tailwind', 'Canvas 2D', 'SSE', 'Vite', 'Accessibility', 'Playwright', 'Jest'],
    },
    {
      level: 'Also worked with',
      description: '',
      items: ['Python', 'FastAPI', 'Java', 'Spring Boot', 'SQL', 'Snowflake', 'Oracle', 'Splunk', 'Tableau', 'AWS', 'Docker', 'Kubernetes', 'Redis'],
    },
  ],

  // kept for reference, not rendered
  skills: [
    {
      category: 'UX Process',
      color: 'teal',
      items: ['User Interviews', 'Personas', 'Wireframing', 'Prototyping', 'Usability Testing', 'Iterative Design', 'Sketch', 'Miro'],
    },
    {
      category: 'Frontend',
      color: 'blue',
      items: ['React', 'Redux Toolkit', 'TypeScript', 'D3.js', 'AG Grid', 'Vite', 'CSS / LESS / SASS', 'Tailwind'],
    },
    {
      category: 'Cloud & DevOps',
      color: 'orange',
      items: ['AWS', 'Docker', 'Kubernetes'],
    },
    {
      category: 'Backend',
      color: 'orange',
      items: ['Java', 'Spring Boot', 'Python', 'LLM / SSE', 'REST APIs'],
    },
    {
      category: 'Testing & Quality',
      color: 'green',
      items: ['Playwright', 'Cypress', 'Jest', 'JUnit', 'Mockito', 'JMeter', 'SonarQube'],
    },
    {
      category: 'Data & Monitoring',
      color: 'purple',
      items: ['Snowflake', 'Oracle', 'SingleStore', 'Redis', 'Splunk', 'Tableau'],
    },
    {
      category: 'Security',
      color: 'red',
      items: ['RBAC', 'OAuth 2.0 / JWT', 'XSS Prevention', 'CSRF / SQLi Prevention', 'CSP'],
    },
  ],

  experience: [
    {
      company: 'Apple Inc.',
      via: 'via VMC Soft Tech',
      role: 'Frontend Engineer',
      period: 'Apr 2017 – Present',
      current: true,
      summary: '',
      bullets: [
        'Built and shipped 10+ web apps for Apple\'s internal analytics platform, used daily by 60,000+ users across operations — owning the full arc from UX research and prototyping through to production.',
        'Built Report Studio, a drag-and-resize dashboard builder now embedded across multiple internal teams.',
        'Led an AI assistant pilot with real-time LLM token streaming over SSE, integrated directly into the analytics platform.',
        'Maintained WCAG AA accessibility across all 10 applications — audited, tested with screen readers, and enforced through Playwright automated checks.',
      ],
      tags: ['React', 'TypeScript', 'D3.js', 'AG Grid', 'Redux Toolkit', 'Splunk', 'Playwright', 'SSE'],
    },
    {
      company: 'Apple Inc.',
      via: 'via Galaxy i Tech',
      role: 'UI Developer',
      period: 'Jul 2015 – Mar 2017',
      current: false,
      summary: '',
      bullets: [
        'Built reusable enterprise UI primitives used across multiple internal teams.',
        'Built the Admin Health Module — a real-time dashboard tracking 20+ KPIs.',
        'Migrated the CSAT platform from a legacy Flash-based app to React, validated with multiple rounds of user interviews.',
      ],
      tags: ['React', 'Redux', 'TypeScript', 'CSS/LESS', 'JMeter', 'Playwright'],
    },
    {
      company: 'Tata Consultancy Services',
      via: '',
      role: 'Software Engineer',
      period: 'Jun 2012 – Jun 2014',
      current: false,
      summary: '',
      bullets: [
        'Built frontend POCs for enterprise insurance, geospatial risk mapping, and actuarial loss analysis.',
        'Co-designed an early telematics driving risk concept — the precursor to the Drive Score Simulator in this portfolio.',
      ],
      tags: ['HTML', 'CSS', 'jQuery', 'Bootstrap', 'Flash', 'Geospatial APIs'],
    },
  ],
} as const
