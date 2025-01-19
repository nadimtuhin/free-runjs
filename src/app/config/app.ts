const isDev = process.env.NODE_ENV === 'development'

export const APP_CONFIG = {
  social: {
    facebookAppId: '1148490690216280',
    githubRepo: 'https://github.com/nadimtuhin/free-runjs',
    githubIssues: 'https://github.com/nadimtuhin/free-runjs/issues',
    feedbackForm: 'https://forms.gle/K5yuUtnSPxQSFmiE6',
  },
  contact: {
    email: 'nadimtuhin@gmail.com', // You might want to update this with the correct email
    website: isDev ? 'http://localhost:3000' : 'https://runjs.app.nadimtuhin.com', // You might want to update this with the correct website
  },
  sharing: {
    defaultText: 'Check out this awesome JavaScript playground!',
  },
  analytics: {
    plausible: {
      enabled: true,
      domain: 'runjs.app.nadimtuhin.com',
      scriptSrc: 'https://null.app.nadimtuhin.com/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js',
    },
  },
} as const
