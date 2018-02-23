const should = require('chai').should();
const expect = require('chai').expect;

const IdTable = require('../lib/id-table.es6');

describe('IdTable', function() {
  it('should return the index when getIndex(getId(index))', function() {
    const table = new IdTable();

    let i;
    for(let x = 0; x < table.getSize(3) + 3; x++) {
      i = table.getIndex(table.getId(x));
      expect(i).to.equal(x);
    }

  });

  it('should never duplicate an id', function() {
    const table = new IdTable();
    const usedIds = new Set();
    for(let i = 0; i < table.getSize(2) + 5; i++) {
      let id = table.getId(i);

      expect(usedIds.has(id), 'index: ' + i).to.be.false;
      usedIds.add(id);
    }
  });
});