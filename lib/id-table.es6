class IdTable {
  constructor(chars) {
    this.chars = chars || 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ'; //no lowercase L or uppercase I, they look too similar
  }

  getId(number) {
    let i = 0;
    const digits = [];
    while(true) {
      let divided = Math.floor(number / Math.pow(this.chars.length, i));
      const digit = divided % this.chars.length;
      digits.push(digit);
      if(divided < this.chars.length)
        break;
      number -= digit;
      i++;
    }
    return digits.reduceRight((string, cur) => string += this.chars.charAt(cur), '');
  }

  /**
   *
   * @param id
   */
  getIndex(id) {
    const digits = id.split('').reverse();
    let index = 0;
    for(let i = digits.length - 1 ; i >= 0; i--) {
      index += (this.chars.indexOf(digits[i]) + 1) * Math.pow(this.chars.length, i);
    }
    return index;
  }

  /**
   * Gets the space available for a given number of digits
   * @param digits the number of digits
   * @returns {number} the number of IDs available for the given number of digits
   */
  getSize(digits) {
    return Math.pow(this.chars.length, digits);
  }

}

module.exports = IdTable;