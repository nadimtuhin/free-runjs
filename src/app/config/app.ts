const isDev = process.env.NODE_ENV === 'development'

const DOMAIN = isDev ? 'localhost:3000' : 'runjs.app.nadimtuhin.com'
const PROTOCOL = isDev ? 'http' : 'https'
const BASE_URL = `${PROTOCOL}://${DOMAIN}`

export const APP_CONFIG = {
  domains: {
    main: DOMAIN,
    baseUrl: BASE_URL,
    analytics: 'null.app.nadimtuhin.com',
  },
  social: {
    facebookAppId: '1148490690216280',
    githubRepo: 'https://github.com/nadimtuhin/free-runjs',
    githubIssues: 'https://github.com/nadimtuhin/free-runjs/issues',
    feedbackForm: 'https://forms.gle/K5yuUtnSPxQSFmiE6',
  },
  contact: {
    email: 'nadimtuhin@gmail.com', // You might want to update this with the correct email
    website: BASE_URL, // You might want to update this with the correct website
  },
  sharing: {
    defaultText: 'Check out this awesome JavaScript playground!',
  },
  analytics: {
    plausible: {
      enabled: true,
      domain: DOMAIN,
      scriptSrc: `https://null.app.nadimtuhin.com/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js`,
    },
  },
} as const
