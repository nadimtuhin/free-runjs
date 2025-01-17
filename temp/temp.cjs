
      const { writeFile } = require('fs/promises');
      const { join } = require('path');

      let output = '';
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        output += args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" ") + "\n";
        process.stdout.write(output);
      };

      try {
        // Write your JavaScript code here
console.log("Hello World!");

const axios = require('axios')


console.log(axios)
      } catch (error) {
        console.log("Error:", error.message);
      }

      console.log = originalConsoleLog;
    