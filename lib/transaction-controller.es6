const IdTable = require('./id-table.es6');
const Promise = require('bluebird');
const BST = require('@codebling/binary-search-tree').BinarySearchTree;

class TransactionController {
  constructor(options) {
    options = options || {};
    this.timeout = options.timeout || 0;
    this.recycleMinThreshold  = options.recycleMinThreshold || 2000;
    this.idTable = new IdTable();
    this.idIndex = -1;
    this.idDigits = 1;
    this.txMap = new Map();
    this.timeoutTree = new BST();

    this.closeExpired.bind(this);
  }

  setTimeout(timeout) {
    this.timeout = timeout;
  }

  prepare() {
    this.idIndex = this.getNextIdIndex();
    let id = this.idTable.getId(this.idIndex);

    this.txMap.set(id, {index: this.idIndex}); //reserve the id in the map

    return id;
  }
  open(id, request) {
    let record = this.txMap.get(id) || {};
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
    const record = this.close(id, 'resolve', result);
    return record.request;
  }
  closeErroneously(id, error) {
    const record = this.close(id, 'reject', error);
    return record.request;
  }

  unprepare(id) {
    this.close(id, null);
  }
  close(id, resolveOrReject, arg) {
    let record = this.txMap.get(id);
    if(!record) {
      throw new Error('Transaction not found')
    }
    if(resolveOrReject) {
      record[resolveOrReject](arg);
    }
    this.txMap.delete(id);

    if(record.timer) {
      clearTimeout(txInfo.timer);
    }

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
    let isIndexSmallerThanTable = () => this.idIndex < this.idTable.getSize(this.idDigits);
    let isRecyclingPossible = this.idTable.getSize(this.idDigits) - this.txMap.size > this.recycleMinThreshold;
    if(!isIndexSmallerThanTable() && !isRecyclingPossible) {
      ++this.idDigits;
    }
    if(isIndexSmallerThanTable()) {
      nextIndex = this.idIndex + 1;
    } else {
      nextIndex = 0; //we have enough, start reusing
    }
    const usedIndexes = Array.from(this.txMap.values()).map(record => record.index);
    while (true) {
      if(usedIndexes.indexOf(nextIndex) > -1)
        ++nextIndex;
      else
        break;
    }
    return nextIndex;
  }
}

module.exports = TransactionController;