const IdTable = require('../lib/id-table');

const table = new IdTable();

const testPerf = (fn) => {
  const start = Date.now();
  for(x = 0; x < 1000000; x++) {
    fn(x);
  }
  const end = Date.now();
  const diff = end - start;
  const iterationTime = diff / x;
  console.log(fn + ' iteration time * 10k: ' + 10000 * iterationTime);
  return iterationTime;
};


const getIdTime = testPerf(x => table.getId(x));
const getIndexAndGetIdTime = testPerf(x => table.getIndex(table.getId(x)));
const getIndexTime = getIndexAndGetIdTime - getIdTime;
console.log('table.getIndex iteration time * 10k: ' + 10000 * getIndexTime);
