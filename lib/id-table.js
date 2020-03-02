class IdTable {
  constructor(chars) {
    this.chars = chars || 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ'; //no lowercase L or uppercase I, they look too similar
  }

  getId(number) {
    const base = this.chars.length;
    const logb = number == 0 ? 0 : Math.floor(Math.log(number)/Math.log(base)); //log in base 'base' of number
    const digits = [];
    let leadingDigit = true;
    let baseToTheI, digit; //reuse these every loop instead of redeclaring to save gc
    for(let i = logb; i >= 0; i--) {
      baseToTheI = Math.pow(base, i);
      digit = Math.floor(number / baseToTheI);
      number -= digit * baseToTheI;
      if(leadingDigit && i != 0) {
        --digit;
        leadingDigit = false;
      }
      digits.push(digit);
    }
    return digits.reduce((string, cur) => string += this.chars.charAt(cur), '');
  }

  /**
   *
   * @param id
   */
  getIndex(id) {
    const base = this.chars.length;
    const digits = id.split('').reverse();
    let index = 0;
    let leadingDigit = true;
    for(let i = digits.length - 1 ; i >= 0; i--) {
      let digit = this.chars.indexOf(digits[i]);
      if(leadingDigit && i != 0) {
        leadingDigit = false;
        ++digit;
      }
      index += digit * Math.pow(base, i);
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