export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
}

export type Locale = 'en' | 'es' | 'fr' | 'ja'

export const t = {
  en: {
    nav: {
      about: 'About', skills: 'Skills',
      lab: 'Demos', contact: 'Contact',
    },
    about:   { label: 'About',        title: 'What I Build' },
    skills:  { label: 'Expertise',    title: 'Skills & Tools' },
    contact: {
      label: 'Contact', title: "Let's Connect",
      tagline: 'Reach out to discuss frontend engineering roles, dashboard architecture, or custom visualization engines.',
    },
    skipLink: 'Skip to main content',
  },
  es: {
    nav: {
      about: 'Sobre Mí', skills: 'Habilidades',
      lab: 'Demos', contact: 'Contacto',
    },
    about:   { label: 'Sobre Mí',    title: '¿Quién Soy?' },
    skills:  { label: 'Experiencia', title: 'Habilidades y Herramientas' },
    contact: {
      label: 'Contacto', title: 'Conectemos',
      tagline: 'Disponible para roles de desarrollo frontend, consultoría o colaboraciones.',
    },
    skipLink: 'Ir al contenido principal',
  },
  fr: {
    nav: {
      about: 'À propos', skills: 'Compétences',
      lab: 'Demos', contact: 'Contact',
    },
    about:   { label: 'À propos',  title: 'Qui je suis' },
    skills:  { label: 'Expertise', title: 'Compétences & Outils' },
    contact: {
      label: 'Contact', title: 'Contactez-moi',
      tagline: 'Ouvert aux postes de développeur frontend, consulting ou collaborations.',
    },
    skipLink: 'Aller au contenu principal',
  },
  ja: {
    nav: {
      about: '概要', skills: 'スキル',
      lab: 'Demos', contact: '連絡',
    },
    about:   { label: '概要',    title: '自己紹介' },
    skills:  { label: '専門知識', title: 'スキルとツール' },
    contact: {
      label: '連絡先', title: 'つながりましょう',
      tagline: 'フロントエンドエンジニア職、コンサルティング、協業に関心があります。',
    },
    skipLink: 'メインコンテンツへスキップ',
  },
} as const
