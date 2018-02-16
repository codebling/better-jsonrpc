class IdTable {
  constructor(chars, digits) {
    this.table = [];
    this.digits = digits || 0;
    this.chars = (chars || 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ').split(''); //no lowercase L or uppercase I, they look too similar
    for(let x=1; x <= digits; x++)
      this.extend();
  }

  extend() {
    this.table.push(...recurseDigits(this.chars, ++this.digits));
    return this.table;
  }

  get length() {
    return this.table.length;
  }

  getTable() {
    return this.table;
  }
}

function recurseDigits(availableCharacters, numberOfDigits, current, ret) {
  --numberOfDigits;
  if(!ret)
    ret = [];
  if(!current)
    current = '';
  
  availableCharacters.forEach(function(character) {
    let newer = current + character;
    if(numberOfDigits > 0)
      recurseDigits(availableCharacters, numberOfDigits, newer, ret);
    else
      ret.push(newer);
  });

  return ret;
}

module.exports = IdTable;