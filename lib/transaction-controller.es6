const IdTable = require('./id-table.es6');
const Promise = require('bluebird');
const BST = require('binary-search-tree').BinarySearchTree;

class TransactionController {
  constructor(options) {
    options = options || {};
    this.timeout = options.timeout || 0;
    this.idTable = new IdTable(null, 2);
    this.idIndex = 0;
    this.txMap = new Map();
    this.timeoutTree = new BST();

    this.closeExpired.bind(this);
  }

  setTimeout(timeout) {
    this.timeout = timeout;
  }

  prepare() {
    this.idIndex = this.getNextIdIndex();
    let id = this.idTable.table[this.idIndex];

    this.txMap.set(id, {}); //reserve the id in the map
    ++this.idIndex;

    return id;
  }
  open(id, request) {
    let record = this.txMap.get(id);
    record.request = request;

    let promise = new Promise(function(resolve, reject) {
      record.resolve = resolve;
      record.reject = reject;
    });
    record.promise = promise;

    if(this.timeout) {
      this.timeoutTree.insert(Date.now() + this.timeout, id);
      let timer = setTimeout(this.closeExpired, this.timeout);
      record.timer = timer;
    }

    this.txMap.set(id, record);

    return promise;
  }
  closeSuccessly(id, result) {
    this.close(id, 'resolve', result);
  }
  closeErroneously(id, error) {
    let record = this.close(id, 'reject', error);
    if(record.timer) {
      clearTimeout(txInfo.timer);
    }
  }

  close(id, resolveOrReject, arg) {
    let record = this.txMap.get(id);
    if(!record) {
      throw new Error('Transaction not found')
    }
    record[resolveOrReject](arg);
    this.txMap.delete(id);

    return record;
  }

  closeExpired() {
    let expiredTransactions = this.timeoutTree.betweenBounds({$lte: Date.now()});
    let count = 0;
    expiredTransactions.forEach(id => {
      this.timeoutTree.delete(id);
      this.closeErroneously(id, 'Timed out');
      count++;
    });
    return count;
  }

  getNextIdIndex() {
    let nextIndex;
    if(this.idIndex < this.idTable.length) {
      nextIndex = this.idIndex + 1;
    } else {
      if(this.idTable.length - thix.txMap.size < 2000) {
        this.idTable.extend();
        nextIndex = this.getNextIdIndex();
      } else {
        nextIndex = 0; //we have enough, start reusing
      }
    }
    return nextIndex;
  }
}

module.exports = TransactionController;