export type ModuleType = 'esm' | 'commonjs'

export const defaultCode = {
  esm: '// Write your JavaScript code here using ES Modules\nimport axios from "axios";\nconsole.log("Hello World!");',
  commonjs: '// Write your JavaScript code here using CommonJS\nconst axios = require("axios");\nconsole.log("Hello World!");'
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
