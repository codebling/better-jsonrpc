const IdTable = require('./id-table.es6');
const Promise = require('bluebird');
const BST = require('binary-search-tree').BinarySearchTree;

class TransactionController {
  constructor(timeout) {
    this.timeout = timeout || 0;
    this.idTable = new IdTable(null, 2);
    this.idIndex = 0;
    this.txMap = new Map();
    this.timeoutTree = new BST();

    this.rejectExpired.bind(this);
  }

  setTimeout(timeout) {
    this.timeout = timeout;
  }

  create(request) {
    this.idIndex = this.getNextIdIndex();
    let id = this.idTable.table[this.idIndex];
    request.id = id;
    let txInfo = {request: request};

    let promise = new Promise(function(resolve, reject) {
      txInfo.resolve = resolve;
      txInfo.reject = reject;
    });
    txInfo.promise = promise;

    if(this.timeout) {
      this.timeoutTree.insert(Date.now() + this.timeout, id);
      let timer = setTimeout(this.rejectExpired, this.timeout);
      txInfo.timer = timer;
    }

    this.txMap.set(id, txInfo);

    return promise;
  }
  resolve(response) {
    let id = response.id;
    let record = this.txMap.get(id);
    if(!record) {
      throw new Error('Transaction not found')
    }
    if(response.error && reponse.error.message) {
      let message = 'Transaction ' + response.id + ' failed';
      if(response.error.code) {
        message += ' with code ' + response.error.id;
      }
      record.reject(new Error(message + ': ' + response.error.message));
    } else {
      if(response.result) {
        record.resolve(result);
      } else {
        record.reject(new Error('Transaction ' + response.id + ' has no error or result object'))
      }
    }
  }

  rejectExpired() {
    let expiredTransactions = this.timeoutTree.betweenBounds({$lte: Date.now()});
    let count = 0;
    expiredTransactions.forEach(id => {
      this.timeoutTree.delete(id);
      let txInfo = this.txMap.get(id);
      txInfo.reject('Timed out!');
      clearTimeout(txInfo.timer);

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