const isDev = process.env.NODE_ENV === 'development'

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || (isDev ? 'localhost:3000' : 'localhost:3000')
const PROTOCOL = isDev ? 'http' : (process.env.NEXT_PUBLIC_PROTOCOL || 'https')
const BASE_URL = `${PROTOCOL}://${DOMAIN}`

// Analytics: set NEXT_PUBLIC_PLAUSIBLE_DOMAIN and NEXT_PUBLIC_PLAUSIBLE_SRC to enable
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || ''
const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || ''

export const APP_CONFIG = {
  domains: {
    main: DOMAIN,
    baseUrl: BASE_URL,
  },
  social: {
    githubRepo: 'https://github.com/nadimtuhin/free-runjs',
    githubIssues: 'https://github.com/nadimtuhin/free-runjs/issues',
    feedbackForm: 'https://forms.gle/K5yuUtnSPxQSFmiE6',
  },
  contact: {
    email: 'nadimtuhin@gmail.com',
    website: BASE_URL,
  },
  sharing: {
    defaultText: 'Check out this awesome JavaScript playground!',
  },
  analytics: {
    plausible: {
      enabled: !!(plausibleDomain && plausibleSrc),
      domain: plausibleDomain,
      scriptSrc: plausibleSrc,
    },
  },
} as const
