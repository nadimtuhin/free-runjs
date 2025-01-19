export type ModuleType = 'esm' | 'commonjs'

export const defaultCode = {
  esm: `// Modern JavaScript using ES Modules
import axios from 'axios';

// Utility function to format data
const formatUserData = (user) => {
  return {
    name: user.name,
    email: user.email,
    company: user.company.name
  };
};

// Async function to fetch and process user data
async function fetchUserData(userId) {
  try {
    const response = await axios.get(\`https://jsonplaceholder.typicode.com/users/\${userId}\`);
    const formattedData = formatUserData(response.data);
    console.log('User Data:', formattedData);

    // Using modern JS features
    const { name, email, company } = formattedData;
    console.log(\`\${name} works at \${company}\`);
    console.log(\`Contact: \${email}\`);
  } catch (error) {
    console.error('Error fetching user:', error.message);
  }
}

// Execute the function (top-level await in ESM)
await fetchUserData(1);`,

  commonjs: `// Traditional Node.js using CommonJS
const axios = require('axios');

// Helper function to calculate time differences
function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return interval === 1 ? \`1 \${unit} ago\` : \`\${interval} \${unit}s ago\`;
    }
  }
  return 'just now';
}

// Example usage with async/await
async function displayPostInfo() {
  try {
    // Fetch a blog post
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
    const post = response.data;

    // Get author details
    const authorResponse = await axios.get(\`https://jsonplaceholder.typicode.com/users/\${post.userId}\`);
    const author = authorResponse.data;

    // Format and display the information
    console.log('Post Title:', post.title);
    console.log('Author:', author.name);
    console.log('Posted:', timeAgo(new Date(Date.now() - 3600000))); // 1 hour ago
    console.log(\`\\nExcerpt: \${post.body.slice(0, 100) + '...'}\`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
displayPostInfo();`
}

export const isValidModuleType = (type: any): type is ModuleType => {
  return type === 'esm' || type === 'commonjs'
}

export const convertCode = (code: string, fromType: ModuleType, toType: ModuleType): string => {
  if (fromType === toType) return code;

  // Convert from ESM to CommonJS
  if (fromType === 'esm' && toType === 'commonjs') {
    return code
      // Convert import statements
      .replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require("$2")')
      // Convert named imports
      .replace(/import\s*{\s*([^}]+)}\s+from\s+['"]([^'"]+)['"]/g, (_, imports, module) => {
        const vars = imports.split(',').map((i: string) => i.trim());
        return `const { ${vars.join(', ')} } = require("${module}")`;
      })
      // Convert default + named imports
      .replace(/import\s+(\w+)\s*,\s*{\s*([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
        'const $1 = require("$3"); const { $2 } = require("$3")')
      // Convert export default
      .replace(/export\s+default\s+([^;\n]+)/g, 'module.exports = $1')
      // Convert named exports
      .replace(/export\s+const\s+(\w+)/g, 'exports.$1')
      .replace(/export\s+function\s+(\w+)/g, 'exports.$1 = function');
  }

  // Convert from CommonJS to ESM
  if (fromType === 'commonjs' && toType === 'esm') {
    return code
      // Convert require statements
      .replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g, 'import $1 from "$2"')
      // Convert destructured require
      .replace(/const\s*{\s*([^}]+)}\s*=\s*require\(['"]([^'"]+)['"]\)/g, 'import { $1 } from "$2"')
      // Convert module.exports
      .replace(/module\.exports\s*=\s*([^;\n]+)/g, 'export default $1')
      // Convert exports.x assignments
      .replace(/exports\.(\w+)\s*=\s*/g, 'export const $1 = ');
  }

  return code;
}
