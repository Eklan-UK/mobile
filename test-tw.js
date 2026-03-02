const { create } = require('twrnc');
const tw = create();
console.log(tw.prefixMatch('dark'));
tw.setColorScheme('dark');
console.log(tw.prefixMatch('dark'));
