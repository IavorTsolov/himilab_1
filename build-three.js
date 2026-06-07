// Simple script to download Three.js and create a UMD bundle
const fs = require('fs');
const path = require('path');

// Read the module version
const moduleCode = fs.readFileSync(
  path.join(__dirname, '../node_modules/three/build/three.module.js'),
  'utf8'
);

// Wrap it in a UMD pattern
const umdCode = `(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.THREE = {}));
}(this, (function(exports) {
    ${moduleCode}
})));`;

fs.writeFileSync(
  path.join(__dirname, '../js/three-umd.js'),
  umdCode
);

console.log('Created UMD bundle at js/three-umd.js');
