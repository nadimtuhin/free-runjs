export type ModuleType = 'esm' | 'commonjs'

export const defaultCode = {
  esm: `// Modern JavaScript using ES Modules with Lodash
import _ from 'lodash';

// Sample data
const users = [
  { name: 'John', age: 25, active: true },
  { name: 'Jane', age: 30, active: false },
  { name: 'Bob', age: 28, active: true }
];

// Using lodash to filter and transform data
const activeUsers = _.chain(users)
  .filter('active')
  .map(user => ({
    name: _.upperFirst(user.name),
    age: user.age
  }))
  .value();

console.log('Active Users:', activeUsers);

// More lodash examples
const numbers = [1, 2, 2, 3, 4, 4, 5];
console.log('Unique numbers:', _.uniq(numbers));
console.log('Average age:', _.meanBy(users, 'age'));

// Using lodash utilities
const greeting = _.template('Hello <%= name %>!');
console.log(greeting({ name: 'World' }));`,

  commonjs: `// Traditional Node.js using CommonJS with Lodash
const _ = require('lodash');

// Sample collection
const fruits = [
  { name: 'apple', color: 'red', quantity: 5 },
  { name: 'banana', color: 'yellow', quantity: 3 },
  { name: 'orange', color: 'orange', quantity: 4 }
];

// Group fruits by color
const fruitsByColor = _.groupBy(fruits, 'color');
console.log('Fruits grouped by color:', fruitsByColor);

// Sum up total quantity
const totalFruits = _.sumBy(fruits, 'quantity');
console.log('Total fruits:', totalFruits);

// Transform the collection
const fruitNames = _.map(fruits, fruit =>
  _.startCase(fruit.name)
);
console.log('Formatted fruit names:', fruitNames);

// Using lodash helper functions
const numbers = _.range(1, 6);
console.log('Random number from 1-5:', _.sample(numbers));
console.log('Shuffled numbers:', _.shuffle(numbers));`
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
