import EventedTokenizer from './evented-tokenizer';

function Tokenizer(entityParser, options) {
  this.token = null;
  this.startLine = 1;
  this.startColumn = 0;
  this.options = options || {};
  this.tokenizer = new EventedTokenizer(this, entityParser);
}

Tokenizer.prototype = {
  tokenize: function(input) {
    this.tokens = [];
    this.tokenizer.tokenize(input);
    return this.tokens;
  },

  tokenizePart: function(input) {
    this.tokens = [];
    this.tokenizer.tokenizePart(input);
    return this.tokens;
  },

  tokenizeEOF: function() {
    this.tokens = [];
    this.tokenizer.tokenizeEOF();
    return this.tokens[0];
  },

  reset: function() {
    this.token = null;
    this.startLine = 1;
    this.startColumn = 0;
  },

  addLocInfo: function() {
    if (this.options.loc) {
      this.token.loc = {
        start: {
          line: this.startLine,
          column: this.startColumn
        },
        end: {
          line: this.tokenizer.line,
          column: this.tokenizer.column
        }
      };
    }
    this.startLine = this.tokenizer.line;
    this.startColumn = this.tokenizer.column;
  },

  // Data

  beginData: function() {
    this.token = {
      type: 'Chars',
      chars: ''
    };
    this.tokens.push(this.token);
  },

  appendToData: function(char) {
    this.token.chars += char;
  },

  finishData: function() {
    this.addLocInfo();
  },

  // Comment

  beginComment: function() {
    this.token = {
      type: 'Comment',
      chars: ''
    };
    this.tokens.push(this.token);
  },

  appendToCommentData: function(char) {
    this.token.chars += char;
  },

  finishComment: function() {
    this.addLocInfo();
  },

  // Tags - basic

  beginStartTag: function() {
    this.token = {
      type: 'StartTag',
      tagName: '',
      attributes: [],
      selfClosing: false
    };
    this.tokens.push(this.token);
  },

  beginEndTag: function() {
    this.token = {
      type: 'EndTag',
      tagName: ''
    };
    this.tokens.push(this.token);
  },

  finishTag: function() {
    this.addLocInfo();
  },

  markTagAsSelfClosing: function() {
    this.token.selfClosing = true;
  },

  // Tags - name

  appendToTagName: function(char) {
    this.token.tagName += char;
  },

  // Tags - attributes

  beginAttribute: function() {
    // [key:string, values:array, expressions:array, isQuotes:bool]
    this._currentAttribute = ["", [], [], null];
    this.token.attributes.push(this._currentAttribute);
  },

  appendToAttributeName: function(char) {
    this._currentAttribute[0] += char;
  },

  beginAttributeValue: function(isQuoted) {
    this._attrValueIndex = 0;
    this._currentAttribute[1].push("");
    this._currentAttribute[3] = isQuoted;
  },

  beginNextAttributeValue: function() {
    this._attrValueIndex++;
    this._currentAttributeValue = "";
    this._currentAttribute[1].push(this._currentAttributeValue);
  },

  appendToAttributeValue: function(char) {
    var appended = this._currentAttribute[1][this._attrValueIndex] += char;
    this._currentAttribute[1][this._attrValueIndex] = appended;
  },

  finishAttributeValue: function() {
  },

  beginAttributeValueExp: function() {
    this._attrExpIndex = 0;
    this._attrExpAttrIndex = -1;
    this._currentAttributeExp = {
      expName: "",
      attributes: []
    };
    this._currentAttribute[2].push(this._currentAttributeExp);
  },

  appendToAttributeValueExpName: function(char) {
    this._currentAttributeExp.expName += char;
  },

  beginAttributeValueExpAttr: function() {
    this._attrExpAttrIndex++;
    this._currentAttributeExp[this._attrExpAttrIndex].push(["", "", false, false]);
  },

  appendToAttributeValueExpAttrName: function(char) {
    var appended = this._currentAttributeExp.attributes[this._attrExpAttrIndex][0] + char;
    this._currentAttributeExp.attributes[this._attrExpAttrIndex][0] = appended;
  },

  // Expressions - basic

  beginStartExp: function(isBlock) {
    this.token = {
      type: 'StartExp',
      expName: '',
      attributes: [],
      block: isBlock
    };
    this.tokens.push(this.token);
  },

  beginEndExp: function() {
    this.token = {
      type: 'EndExp',
      expname: ''
    };
  },

  appendToExpName: function(char) {
    this.token.expName += char;
  },

  finishExp: function() {
    this.addLocInfo();
  },

  beginExpAttr: function(isLiteral) {
    // [name:string, value:string, isNameLiteral:bool, isValueLiteral:bool:null for no value]
    this._currentExpAttr = ["", "", isLiteral, null];
    this.token.attributes.push(this._currentExpAttr);
  },

  appendToExpAttrName: function(char) {
    this._currentExpAttr[0] += char;
  },

  appendToExpAttrValue: function(char) {
    this._currentExpAttr[1] += char;
  },

  markExpAttrHasValue: function(isLiteral) {
    this._currentExpAttr[3] = isLiteral;
  }
};

export default Tokenizer;
