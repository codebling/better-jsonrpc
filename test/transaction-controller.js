const expect = require('chai').expect;

const TransactionController = require('../lib/transaction-controller');

describe('TransactionController', function() {
  it('should not reuse IDs from existing transactions', function() {
    const controller = new TransactionController();

    const usedIds = new Set();
    for(let i = 0; i < 5000; i++) {
      let id = controller.prepare();

      expect(usedIds.has(id), 'index: ' + i).to.be.false;
      usedIds.add(id);
    }
  });
  it('should eventually reuse IDs from closed transactions', function() {
    const threshold = 10;
    const controller = new TransactionController({recycleMinThreshold: threshold});
    const tableSize = 51;

    const usedIds = new Set();
    for(let i = 0; i < tableSize; i++) {
      let id = controller.prepare();
      usedIds.add(id);
      controller.unprepare(id);
    }

    for(let i = 0; i < tableSize; i++) {
      let id = controller.prepare();
      expect(usedIds.has(id), 'id: ' + id + ' index: ' + i).to.be.true;
    }
  });

  it('should reuse IDs from closed transactions after recycleMinThreshold transactions, but not ones from open transactions', function() {
    const threshold = 10;
    const controller = new TransactionController({recycleMinThreshold: threshold});
    const tableSize = 51;

    const openTransactionIndex = new Set([5,10,35]);
    const openTransactionIds = new Set();

    const usedIds = new Set();
    for(let i = 0; i < tableSize; i++) {
      let id = controller.prepare();
      usedIds.add(id);
      if(openTransactionIndex.has(i)) {
        openTransactionIds.add(id);
      } else {
        controller.unprepare(id);
      }
    }

    for(let i = 0; i < tableSize - openTransactionIndex.length; i++) {
      let id = controller.prepare();

      expect(openTransactionIds.has(id), 'index: ' + i).to.be.false;
      expect(usedIds.has(id), 'index: ' + i).to.be.true;
    }
  });
});