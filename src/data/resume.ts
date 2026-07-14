export const RESUME = {
  name: 'Sasideep Kakumani',
  initials: 'SK',
  title: 'Frontend Engineer · AI & Real-Time Systems',
  subtitle: 'AI/LLM Products · Hardware-Adjacent UI · Accessibility',
  location: 'Bay Area, CA',
  timezone: 'PT (UTC−8)',
  email: 'sasideep.sd53@gmail.com',
  phone: '(510) 320-4310',
  portfolio: 'sasideep.com',
  github: 'https://github.com/sasideep0053-ui/portfolio',
  resumePdf: '/Sasideep-Kakumani-Frontend-Engineer.pdf',

  summary: 'Frontend engineer with 10+ years building high-scale enterprise UIs at Apple — now focused on AI product interfaces and hardware-adjacent UI: real-time LLM streaming, RAG retrieval, and control-loop visualization (PID, sensor telemetry), backed by a decade of dashboard work for 60,000+ daily users.',

  stack: ['React', 'TypeScript', 'LLM Integration', 'RAG', 'Real-Time Systems', 'Three.js / WebGL'],

  stats: [
    { value: '10+', label: 'Years Experience' },
    { value: '10+', label: 'Apps Shipped' },
    { value: '60K+', label: 'Daily Users' },
  ],

  builds: [
    {
      title: 'Docs RAG Assistant',
      tag: 'RAG · ChromaDB · Cross-Encoder · Groq',
      line: 'Hybrid vector + keyword retrieval with cross-encoder reranking and confidence-gated LLM generation — live pipeline trace shows every stage as it runs.',
    },
    {
      title: 'Drone PID Controller',
      tag: 'Control Theory · Physics Engine',
      line: 'Full proportional-integral-derivative control loop with real-time physics simulation, the same class of algorithm used in flight controllers and autonomous vehicles.',
    },
    {
      title: 'Report Studio',
      tag: 'Dashboard Builder',
      line: 'Drag-and-resize dashboard builder — now embedded across multiple internal teams at Apple.',
    },
  ],

  skillTiers: [
    {
      level: 'Core Skillset',
      description: '',
      items: ['TypeScript', 'React', 'LLM Integration', 'RAG', 'WebSocket', 'SSE', 'Three.js / WebGL', 'Redux Toolkit', 'D3.js', 'AG Grid', 'Canvas 2D', 'CSS / LESS / SASS', 'Tailwind', 'Vite', 'Accessibility', 'Playwright', 'Jest'],
    },
    {
      level: 'Also worked with',
      description: '',
      items: ['Python', 'FastAPI', 'PID Control', 'Physics Simulation', 'Java', 'Spring Boot', 'SQL', 'Snowflake', 'Oracle', 'Splunk', 'Tableau', 'AWS', 'Docker', 'Kubernetes', 'Redis'],
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
        'Led a conversational AI assistant pilot for a targeted 5,000-user internal rollout — built the streaming chat UI with real-time LLM token rendering over SSE, end to end.',
        'Shipped 10+ web apps for Apple\'s internal analytics platform, used daily by 60,000+ users across operations — replacing manual reporting workflows and shortening the path from data to decision, while owning the full arc from requirements gathering through production.',
        'Delivered Report Studio, a drag-and-resize dashboard builder now embedded across multiple internal teams, plus custom D3.js and AG Grid visualizations for complex data drill-downs.',
        'Architected the Admin Health Module, a real-time dashboard tracking 20+ KPIs, and served as primary liaison across Support, DevOps, and Database teams on infrastructure and data integrity.',
      ],
      tags: ['React', 'TypeScript', 'LLM / SSE', 'D3.js', 'AG Grid', 'Redux Toolkit', 'Playwright'],
    },
    {
      company: 'Apple Inc.',
      via: 'via Galaxy i Tech',
      role: 'UI Developer',
      period: 'Jul 2015 – Mar 2017',
      current: false,
      summary: '',
      bullets: [
        'Delivered enterprise UI components for internal Apple tools with a focus on UX quality and performance.',
        'Migrated the CSAT platform from a legacy Flash-based app to React, validated with multiple rounds of user interviews.',
        'Integrated automated test suites (Cypress/Playwright) to protect critical user journeys and reduce regressions.',
      ],
      tags: ['React', 'Redux', 'TypeScript', 'CSS/LESS', 'Cypress', 'Playwright'],
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
        'Co-designed an early telematics driving risk concept — later revisited independently as a full driving-risk simulator (WebSocket + physics engine).',
      ],
      tags: ['HTML', 'CSS', 'jQuery', 'Bootstrap', 'Geospatial APIs'],
    },
  ],

  education: [
    { degree: 'M.S. Software Engineering' },
    { degree: 'M.S. Computer Science' },
    { degree: 'B.Tech, Electronics & Communications Engineering' },
  ],
} as const
