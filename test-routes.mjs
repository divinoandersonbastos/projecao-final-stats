import { parse } from '/home/ubuntu/projecao-final-stats/node_modules/.pnpm/regexparam@3.0.0/node_modules/regexparam/dist/index.mjs';

// Test the outer route
const outer = parse('/dashboard/:rest*');
console.log('Outer pattern:', outer.pattern);
console.log('Outer keys:', outer.keys);
console.log('Test /dashboard/analysis/90001:', outer.pattern.exec('/dashboard/analysis/90001'));

// Test the inner route  
const inner = parse('/dashboard/analysis/:id');
console.log('\nInner pattern:', inner.pattern);
console.log('Inner keys:', inner.keys);
console.log('Test /dashboard/analysis/90001:', inner.pattern.exec('/dashboard/analysis/90001'));

// Test loose mode (used for nesting)
const outerLoose = parse('/dashboard/:rest*', true);
console.log('\nOuter (loose) pattern:', outerLoose.pattern);
console.log('Test /dashboard/analysis/90001:', outerLoose.pattern.exec('/dashboard/analysis/90001'));
