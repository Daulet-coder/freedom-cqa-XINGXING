const fs = require('fs');
const babel = require('./frontend/vendor/babel.min.js');
const app = fs.readFileSync(__dirname+'/frontend/app.jsx','utf8');
const workspace = fs.readFileSync(__dirname+'/frontend/workspace.jsx','utf8');
const source = app.replace('function App(){', workspace+'\nfunction App(){');
const output = babel.transform(source, {presets:['react'],comments:false}).code;
fs.writeFileSync(__dirname+'/frontend/app.js', output);
console.log('React interface built: frontend/app.js');
