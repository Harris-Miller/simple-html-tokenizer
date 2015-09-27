import { preprocessInput, isAlpha, isSpace } from './utils';

function EventedTokenizer(delegate, entityParser) {
  this.delegate = delegate;
  this.entityParser = entityParser;

  this.state = null;
  this.input = null;

  this.index = -1;
  this.line = -1;
  this.column = -1;
  this.tagLine = -1;
  this.tagColumn = -1;
  this.expLine = -1;
  this.expColumn = -1;

  this.reset();
}

EventedTokenizer.prototype = {
  reset: function() {
    this.state = 'beforeData';
    this.input = '';

    this.index = 0;
    this.line = 1;
    this.column = 0;

    this.tagLine = -1;
    this.tagColumn = -1;

    this.expLine = -1;
    this.expColumn = -1;

    this.delegate.reset();
  },

  tokenize: function(input) {
    this.reset();
    this.tokenizePart(input);
    this.tokenizeEOF();
  },

  tokenizePart: function(input) {
    this.input += preprocessInput(input);

    while (this.index < this.input.length) {
      this.states[this.state].call(this);
    }
  },

  tokenizeEOF: function() {
    this.flushData();
  },

  flushData: function() {
    if (this.state === 'data') {
      this.delegate.finishData();
      this.state = 'beforeData';
    }
  },

  peek: function() {
    return this.input.charAt(this.index);
  },

  peekNext: function() {
    return this.input.charAt(this.index + 1);
  },

  consume: function() {
    var char = this.peek();

    this.index++;

    if (char === "\n") {
      this.line++;
      this.column = 0;
    } else {
      this.column++;
    }

    return char;
  },

  consumeCharRef: function() {
    var endIndex = this.input.indexOf(';', this.index);
    if (endIndex === -1) {
      return;
    }
    var entity = this.input.slice(this.index, endIndex);
    var chars = this.entityParser.parse(entity);
    if (chars) {
      this.index = endIndex+1;
      return chars;
    }
  },

  markTagStart: function() {
    this.tagLine = this.line;
    this.tagColumn = this.column;
  },

  markExpOpen: function() {
    this.tagLine = this.line;
    this.tagColumn = this.column - 1; // back one column because the expression started at the first { of the {{'s
  },

  states: {
    beforeData: function() {
      var char = this.peek();

      if (char === "<") {
        this.state = 'tagOpen';
        this.markTagStart();
        this.consume();
      } else if (char === "{") {
        this.consume();
        // special for beforeData
        if (this.peek() === "{") {
          this.state = 'expOpen';
          this.markExpOpen();
          this.consume();
        } else {
          this.state = 'data';
          this.delegate.beginData();
          this.delegate.appendToData(char);
        }
      } else {
        this.state = 'data';
        this.delegate.beginData();
      }
    },

    data: function() {
      var char = this.peek();

      if (char === "<") {
        this.delegate.finishData();
        this.state = 'tagOpen';
        this.markTagStart();
        this.consume();
      } else if (char === "&") {
        this.consume();
        this.delegate.appendToData(this.consumeCharRef() || "&");
      } else if (char === "{") {
        this.state = 'possibleExpOpen';
      } else {
        this.consume();
        this.delegate.appendToData(char);
      }
    },

    tagOpen: function() {
      var char = this.consume();

      if (char === "!") {
        this.state = 'markupDeclaration';
      } else if (char === "/") {
        this.state = 'endTagOpen';
      } else if (isAlpha(char)) {
        this.state = 'tagName';
        this.delegate.beginStartTag();
        this.delegate.appendToTagName(char.toLowerCase());
      }
    },

    markupDeclaration: function() {
      var char = this.consume();

      if (char === "-" && this.input.charAt(this.index) === "-") {
        this.index++;
        this.state = 'commentStart';
        this.delegate.beginComment();
      }
    },

    commentStart: function() {
      var char = this.consume();

      if (char === "-") {
        this.state = 'commentStartDash';
      } else if (char === ">") {
        this.delegate.finishComment();
        this.state = 'beforeData';
      } else {
        this.delegate.appendToCommentData(char);
        this.state = 'comment';
      }
    },

    commentStartDash: function() {
      var char = this.consume();

      if (char === "-") {
        this.state = 'commentEnd';
      } else if (char === ">") {
        this.delegate.finishComment();
        this.state = 'beforeData';
      } else {
        this.delegate.appendToCommentData("-");
        this.state = 'comment';
      }
    },

    comment: function() {
      var char = this.consume();

      if (char === "-") {
        this.state = 'commentEndDash';
      } else {
        this.delegate.appendToCommentData(char);
      }
    },

    commentEndDash: function() {
      var char = this.consume();

      if (char === "-") {
        this.state = 'commentEnd';
      } else {
        this.delegate.appendToCommentData("-" + char);
        this.state = 'comment';
      }
    },

    commentEnd: function() {
      var char = this.consume();

      if (char === ">") {
        this.delegate.finishComment();
        this.state = 'beforeData';
      } else {
        this.delegate.appendToCommentData("--" + char);
        this.state = 'comment';
      }
    },

    tagName: function() {
      var char = this.consume();

      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        this.delegate.finishTag();
        this.state = 'beforeData';
      } else {
        this.delegate.appendToTagName(char);
      }
    },

    beforeAttributeName: function() {
      var char = this.consume();

      if (isSpace(char)) {
        return;
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        this.delegate.finishTag();
        this.state = 'beforeData';
      } else {
        this.state = 'attributeName';
        this.delegate.beginAttribute();
        this.delegate.appendToAttributeName(char);
      }
    },

    attributeName: function() {
      var char = this.consume();

      if (isSpace(char)) {
        this.state = 'afterAttributeName';
      } else if (char === "/") {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.state = 'selfClosingStartTag';
      } else if (char === "=") {
        this.state = 'beforeAttributeValue';
      } else if (char === ">") {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.delegate.finishTag();
        this.state = 'beforeData';
      } else {
        this.delegate.appendToAttributeName(char);
      }
    },

    afterAttributeName: function() {
      var char = this.consume();

      if (isSpace(char)) {
        return;
      } else if (char === "/") {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.state = 'selfClosingStartTag';
      } else if (char === "=") {
        this.state = 'beforeAttributeValue';
      } else if (char === ">") {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.delegate.finishTag();
        this.state = 'beforeData';
      } else {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.state = 'attributeName';
        this.delegate.beginAttribute();
        this.delegate.appendToAttributeName(char);
      }
    },

    beforeAttributeValue: function() {
      var char = this.consume();

      if (isSpace(char)) {
      } else if (char === '"') {
        this.state = 'attributeValueDoubleQuoted';
        this.delegate.beginAttributeValue(true);
      } else if (char === "'") {
        this.state = 'attributeValueSingleQuoted';
        this.delegate.beginAttributeValue(true);
      } else if (char === ">") {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.delegate.finishTag();
        this.state = 'beforeData';
      } else {
        this.state = 'attributeValueUnquoted';
        this.delegate.beginAttributeValue(false);
        this.delegate.appendToAttributeValue(char);
      }
    },

    attributeValueDoubleQuoted: function() {
      var char = this.consume();

      if (char === '"') {
        this.delegate.finishAttributeValue();
        this.state = 'afterAttributeValueQuoted';
      } else if (char === "&") {
        this.delegate.appendToAttributeValue(this.consumeCharRef('"') || "&");
      } else {
        this.delegate.appendToAttributeValue(char);
      }
    },

    attributeValueSingleQuoted: function() {
      var char = this.consume();

      if (char === "'") {
        this.delegate.finishAttributeValue();
        this.state = 'afterAttributeValueQuoted';
      } else if (char === "&") {
        this.delegate.appendToAttributeValue(this.consumeCharRef("'") || "&");
      } else {
        this.delegate.appendToAttributeValue(char);
      }
    },

    attributeValueUnquoted: function() {
      var char = this.consume();

      if (isSpace(char)) {
        this.delegate.finishAttributeValue();
        this.state = 'beforeAttributeName';
      } else if (char === "&") {
        this.delegate.appendToAttributeValue(this.consumeCharRef(">") || "&");
      } else if (char === ">") {
        this.delegate.finishAttributeValue();
        this.delegate.finishTag();
        this.state = 'beforeData';
      } else {
        this.delegate.appendToAttributeValue(char);
      }
    },

    afterAttributeValueQuoted: function() {
      var char = this.peek();

      if (isSpace(char)) {
        this.consume();
        this.state = 'beforeAttributeName';
      } else if (char === "/") {
        this.consume();
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        this.consume();
        this.delegate.finishTag();
        this.state = 'beforeData';
      } else {
        this.state = 'beforeAttributeName';
      }
    },

    selfClosingStartTag: function() {
      var char = this.peek();

      if (char === ">") {
        this.consume();
        this.delegate.markTagAsSelfClosing();
        this.delegate.finishTag();
        this.state = 'beforeData';
      } else {
        this.state = 'beforeAttributeName';
      }
    },

    endTagOpen: function() {
      var char = this.consume();

      if (isAlpha(char)) {
        this.state = 'tagName';
        this.delegate.beginEndTag();
        this.delegate.appendToTagName(char.toLowerCase());
      }
    },

    possibleExpOpen: function() {
      var char = this.peekNext();

      if (char === "{") {
        this.delegate.finishData();
        this.state = 'expOpen';
        this.markExpOpen();
        // double consume because we did peekNext
        this.consume();
        this.consume();
      } else {
        this.state = 'data';
        this.delegate.appendToData("{");
        // double consume because we did peekNext
        this.consume();
        this.consume();
        this.delegate.appendToData(char);
      }
    },

    expOpen: function() {
      var char = this.consume();

      if (char === "!") {
        // TODO: special comment expression
      } else if (char === "/") {
        this.state = 'endExpOpen';
      } else if (char === "#") {
        this.state = 'expOpenBlock';
      } else if (isAlpha(char)) {
        this.state = 'expName';
        this.delegate.beginStartExp(false);
        this.delegate.appendToExpName(char.toLowerCase());
      }
    },

    expOpenBlock: function() {
      var char = this.consume();

      if (isAlpha(char)) {
        this.state = 'expName';
        this.delegate.beginStartExp(true);
        this.delegate.appendToExpName(char.toLowerCase()); 
      }
    },

    endExpOpen: function() {
      var char = this.consume();

      if (isAlpha(char)) {
        this.state = 'expName';
        this.delegate.beginEndExp();
        this.delegate.appendToExpName(char.toLowerCase());
      }
    },

    expName: function() {
      var char = this.consume();

      if (isSpace(char)) {
        this.state = 'beforeExpAttrName';
      } else if (char === "}") {
        this.state = 'possibleExpressionEnd';
      } else {
        this.delegate.appendToExpName(char);
      }
    },

    possibleExpressionEnd: function() {
      var char = this.consume();

      if (char === "}") {
        this.delegate.finishExp();
        this.state = 'beforeData';
      } else {
        // TODO: is this ok to do?
        throw new Error("expressions do not support having a '}' in them unless follwed by a second to signify the closing of the expression.");
      }
    },

    beforeExpAttrName: function() {
      var char = this.consume();

      if (isSpace(char)) {
        return;
      } else if (char === "}") {
        this.state = 'possibleExpressionEnd';
      } else if (char === '"') {
        this.state = 'expAttrNameDoubleQuoted';
        this.delegate.beginExpAttr(true);
      } else if (char === "'") {
        this.state = 'expAttrNameSingleQuoted';
        this.delegate.beginExpAttr(true);
      } else {
        this.state = 'expAttrName';
        this.delegate.beginExpAttr(false);
        this.delegate.appendToExpAttrName(char);
      }
    },

    expAttrName: function() {
      var char = this.consume();

      if (isSpace(char)) {
        this.state = 'beforeExpAttrName';
      } else if (char === "=") {
        this.state = 'beforeExpAttrValue';
      } else if (char === "}") {
        this.state = 'possibleExpressionEnd';
      } else {
        this.delegate.appendToExpAttrName(char);
      }
    },

    expAttrNameSingleQuoted: function() {
      var char = this.consume();

      if (char === "'") {
        this.state = 'afterExpAttrNameQuoted';
      } else {
        this.delegate.appendToExpAttrName(char);
      }
    },

    expAttrNameDoubleQuoted: function() {
      var char = this.consume();

      if (char === '"') {
        this. state = 'afterExpAttrNameQuoted';
      } else {
        this.delegate.appendToExpAttrName(char);
      }
    },

    afterExpAttrNameQuoted: function() {
      var char = this.consume();

      if (isSpace(char)) {
        this.state = 'beforeExpAttrName';
      } else if (char === '=') {
        this.state = 'beforeExpAttrValue';
      } else if (char === '}') {
        this.state = 'possibleExpressionEnd';
      } else {
        // TODO: is this ok?
        throw new Error('exp attr literals must be followed by a space or a "}"');
      }
    },

    beforeExpAttrValue: function() {
      var char = this.consume();

      if (isSpace(char)) {
        return;
      } else if (char === '"') {
        this.state = 'expAttrValueDoubleQuote';
        this.delegate.markExpAttrHasValue(true);
      } else if (char === "'") {
        this.state = 'expAttrValueSingleQuoted';
        this.delegate.markExpAttrHasValue(true);
      } else {
        this.state = 'expAttrValue';
        this.delegate.markExpAttrHasValue(false);
        this.delegate.appendToExpAttrValue(char);
      }
    },

    expAttrValue: function() {
      var char = this.consume();

      if (isSpace(char)) {
        this.state = 'beforeExpAttrName';
      } else if (char === "}") {
        this.state = 'possibleExpressionEnd';
      } else {
        this.delegate.appendToExpAttrValue(char);
      }
    },

    expAttrValueSingleQuoted: function() {
      var char = this.consume();

      if (char === "'") {
        this.state = 'afterExpAttrValueQuoted';
      } else {
        this.delegate.appendToExpAttrValue(char);
      }
    },

    expAttrValueDoubleQuote: function() {
      var char = this.consume();

      if (char === '"') {
        this.state = this.state = 'afterExpAttrValueQuoted';
      } else {
        this.delegate.appendToExpAttrValue(char);
      }
    },

    afterExpAttrValueQuoted: function() {
      var char = this.consume();

      if (isSpace(char)) {
        this.state = 'beforeExpAttrName';
      } else if (char === '}') {
        this.state = 'possibleExpressionEnd';
      } else {
        // TODO: is this ok?
        throw new Error('exp value literals must be followed by a space or a "}"');
      }
    }
  }
};

export default EventedTokenizer;
