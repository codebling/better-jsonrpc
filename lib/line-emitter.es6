const EventEmitter = require('events');

class LineEmitter extends EventEmitter {
  constructor(readable) {
    super();
    this.buffer = '';
    this.processData = this.processData.bind(this);
    this.readable = readable;
    this.resetBuffer = (() => this.buffer = '').bind(this);
    readable.on('data', this.processData);
    readable.on('end', this.resetBuffer);
    readable.on('close', this.resetBuffer);
  }
  processData(stringData) {
    this.buffer += stringData;

    let newlineFound = false;
    do {
      let newlineIndex = this.buffer.indexOf('\n');
      let line = '';
      newlineFound = newlineIndex >= 0;
      if(newlineFound) {
        line = this.buffer.slice(0, newlineIndex);
        this.buffer = this.buffer.slice(newlineIndex + 1);
      }
      if(line.length > 0) {
        this.emit('line', line);
      }
    } while(newlineFound);
  }

  destroy() {
    super.eventNames().forEach(eventName => super.removeAllListeners(eventName));
    this.readable.removeListener('data', this.processData);
    this.readable.removeListener('end', this.resetBuffer);
    this.readable.removeListener('close', this.resetBuffer);
    this.buffer = null;
    this.readable = null;
  }
}

module.exports = LineEmitter;