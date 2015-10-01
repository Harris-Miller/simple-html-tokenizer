/* global HTML5Tokenizer: false */
QUnit.module("simple-html-tokenizer - tokenizer");

QUnit.test("Simple content", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("hello");
  assert.deepEqual(tokens, [
    chars("hello")
  ]);
});

QUnit.test("Content containing '{'", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("curly { brace");
  assert.deepEqual(tokens, [
    chars("curly { brace")]);
});

QUnit.test("A simple tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div>");
  assert.deepEqual(tokens, [
    startTag("div")
  ]);
});

QUnit.test("A simple tag with trailing spaces", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div   \t\n>");
  assert.deepEqual(tokens, [
    startTag("div")
  ]);
});

QUnit.test("A simple closing tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("</div>");
  assert.deepEqual(tokens, [
    endTag("div")
  ]);
});

QUnit.test("A simple closing tag with trailing spaces", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("</div   \t\n>");
    assert.deepEqual(tokens, [
    endTag("div")
  ]);
});

QUnit.test("A pair of hyphenated tags", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<x-foo></x-foo>");
  assert.deepEqual(tokens, [
    startTag("x-foo"),
    endTag("x-foo")
  ]);
});

QUnit.test("A tag with a single-quoted attribute", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div id='foo'>");
  assert.deepEqual(tokens, [
    startTag("div", [["id", ["foo"], [], true]])
  ]);
});

QUnit.test("A tag with a double-quoted attribute", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<div id="foo">');
  assert.deepEqual(tokens, [
    startTag("div", [["id", ["foo"], [], true]])
  ]);
});

QUnit.test("A tag with a double-quoted empty", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<div id="">');
  assert.deepEqual(tokens, [
    startTag("div", [["id", [""], [], true]])
  ]);
});

QUnit.test("A tag with unquoted attribute", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<div id=foo>');
  assert.deepEqual(tokens, [
    startTag("div", [["id", [ "foo"], [], false]])
  ]);
});

QUnit.test("A tag with valueless attributes", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<div foo bar>');
  assert.deepEqual(tokens, [
    startTag("div", [
      ["foo", [""], [], false],
      ["bar", [""], [], false]
    ])
  ]);
});

QUnit.test("A tag with multiple attributes", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<div id=foo class="bar baz" href=\'bat\'>');
  assert.deepEqual(tokens, [
    startTag("div", [
      ["id", ["foo"], [], false],
      ["class", ["bar", "baz"], [], true],
      ["href", ["bat"], [], true]
    ])
  ]);
});

QUnit.test("A tag with capitalization in attributes", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<svg viewBox="0 0 0 0">');
  assert.deepEqual(tokens, [
    startTag("svg", [["viewBox", ["0", "0" ,"0" ,"0"], [], true]])
  ]);
});

QUnit.test("A tag with capitalization in the tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<linearGradient>');
  assert.deepEqual(tokens, [
    startTag("linearGradient", [])
  ]);
});

QUnit.test("A self-closing tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<img />');
  assert.deepEqual(tokens, [
    startTag("img", [], true)
  ]);
});

QUnit.test("A self-closing tag with valueless attributes (regression)", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<input disabled />');
  assert.deepEqual(tokens, [
    startTag("input", [
      ["disabled", [""], [], false]
    ], true)
  ]);
});

QUnit.test("A self-closing tag with valueless attributes without space before closing (regression)", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<input disabled/>');
  assert.deepEqual(tokens, [
    startTag("input", [
      ["disabled", [""], [], false]
    ], true)
  ]);
});

QUnit.test("A tag with a / in the middle", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<img / src="foo.png">');
  assert.deepEqual(tokens, [
    startTag("img", [["src", ["foo.png"], [], true]])
  ]);
});

QUnit.test("An opening and closing tag with some content", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div id='foo' class='{{bar}} baz'>Some content</div>");
  assert.deepEqual(tokens, [
    startTag("div", [["id", ["foo"], [], true], ["class", ["{{bar}}", "baz"], [], true]]),
    chars("Some content"),
    endTag("div")
  ]);
});

QUnit.test("A comment", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!-- hello -->");
  assert.deepEqual(tokens, [
    comment(" hello ")
  ]);
});

QUnit.test("A (buggy) comment with no ending --", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!-->");
  assert.deepEqual(tokens, [
    comment()
  ]);
});

QUnit.test("A comment that immediately closes", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!---->");
  assert.deepEqual(tokens, [
    comment()
  ]);
});

QUnit.test("A comment that contains a -", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!-- A perfectly legal - appears -->");
  assert.deepEqual(tokens, [
    comment(" A perfectly legal - appears ")
  ]);
});

QUnit.test("A (buggy) comment that contains two --", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!-- A questionable -- appears -->");
  assert.deepEqual(tokens, [
    comment(" A questionable -- appears ")
  ]);
});

QUnit.test("Character references are expanded", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("&quot;Foo &amp; Bar&quot; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;");
  assert.deepEqual(tokens, [
    chars('"Foo & Bar" < << < < ≧̸ &Borksnorlax; ≦̸')
  ]);

  // TODO: figure out how to deal with odd spaces from entityParser
  // &NotGreaterFullEqual; and &nleqq; do weird shit
  // tokens = HTML5Tokenizer.tokenize("<div title='&quot;Foo &amp; Bar&quot; &blk12; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;'>");
  // assert.deepEqual(tokens, [
  //   startTag("div", [
  //     ["title", ['"Foo', '&', 'Bar"', '▒', '<', '<<', '<', '<', '≧̸ &Borksnorlax;', '≦̸'], [], true]
  //   ])
  // ]);

  tokens = HTML5Tokenizer.tokenize("<div title='&quot;Foo &amp; Bar&quot; &blk12; &lt; &#60;&#x3c; &#x3C; &LT; &Borksnorlax;'>");
  assert.deepEqual(tokens, [
    startTag("div", [
      ["title", ['"Foo', '&', 'Bar"', '▒', '<', '<<', '<', '<', '&Borksnorlax;'], [], true]
    ])
  ]);
});

QUnit.module("simple-html-tokenizer - preprocessing");

QUnit.test("Carriage returns are replaced with line feeds", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("\r\r\n\r\r\n\n");
  assert.deepEqual(tokens, [
    chars("\n\n\n\n\n")
  ]);
});

QUnit.module("simple-html-tokenizer - location info");

QUnit.test("lines are counted correctly", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("\r\r\n\r\r\n\n", { loc: true });
  assert.deepEqual(tokens, [
    locInfo(chars("\n\n\n\n\n"), 1, 0, 6, 0)
  ]);
});

QUnit.test("tokens: Chars", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("Chars", { loc: true });
  assert.deepEqual(tokens, [
    locInfo(chars("Chars"), 1, 0, 1, 5)
  ]);
});

QUnit.test("tokens: Chars start-tag Chars", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("Chars<div>Chars", { loc: true });
  assert.deepEqual(tokens, [
    locInfo(chars("Chars"), 1, 0, 1, 5),
    locInfo(startTag('div'), 1, 5, 1, 10),
    locInfo(chars("Chars"), 1, 10, 1, 15)
  ]);
});

QUnit.test("tokens: start-tag start-tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div><div>", { loc: true });
  assert.deepEqual(tokens, [
    locInfo(startTag('div'), 1, 0, 1, 5),
    locInfo(startTag('div'), 1, 5, 1, 10)
  ]);
});

QUnit.test("tokens: Chars start-tag Chars start-tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("Chars\n<div>Chars\n<div>", { loc: true });
  assert.deepEqual(tokens, [
    locInfo(chars("Chars\n"), 1, 0, 2, 0),
    locInfo(startTag('div'), 2, 0, 2, 5),
    locInfo(chars("Chars\n"), 2, 5, 3, 0),
    locInfo(startTag('div'), 3, 0, 3, 5)
  ]);
});

QUnit.test("tokens: comment start-tag Chars end-tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!-- multline\ncomment --><div foo=bar>Chars\n</div>", { loc: true });
  assert.deepEqual(tokens, [
    locInfo(comment(" multline\ncomment "), 1, 0, 2, 11),
    locInfo(startTag('div', [['foo', ["bar"], [], false]]), 2, 11, 2, 24),
    locInfo(chars("Chars\n"), 2, 24, 3, 0),
    locInfo(endTag('div'), 3, 0, 3, 6)
  ]);
});

QUnit.test("A simple expression", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("{{exp}}");
  assert.deepEqual(tokens, [
    startExp('exp')
  ]);
});

QUnit.test("Expression with reference attr", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("{{exp reference}}");
  assert.deepEqual(tokens, [
    startExp('exp', [['reference', "", false, null]])
  ]);
});

QUnit.test("Expression with double quote literal attr", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('{{exp "attr"}}');
  assert.deepEqual(tokens, [
    startExp('exp', [['attr', "", true, null]])
  ]);
});

QUnit.test("Expression with single quote literal attr", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("{{exp 'attr'}}");
  assert.deepEqual(tokens, [
    startExp('exp', [['attr', "", true, null]])
  ]);
});

QUnit.test("Expression with attr set to reference", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('{{exp attr=value}}');
  assert.deepEqual(tokens, [
    startExp('exp', [['attr', 'value', false, false]])
  ]);
});

QUnit.test("Expression with reference set to single double literal", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('{{exp attr="value"}}');
  assert.deepEqual(tokens, [
    startExp('exp', [['attr', 'value', false, true]])
  ]);
});

QUnit.test("Expression with reference set to single single literal", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("{{exp attr='value'}}");
  assert.deepEqual(tokens, [
    startExp('exp', [['attr', 'value', false, true]])
  ]);
});

QUnit.test("Expression with mix of references and literals", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('{{exp "literal" attr=ref attr2="value"}}');
  assert.deepEqual(tokens, [
    startExp('exp', [
      ['literal', "", true, null],
      ['attr', 'ref', false, false],
      ['attr2', 'value', false, true]
    ])
  ]);
});

QUnit.test("tag with attribute equal to exp (no quotes)", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<input type="text" value={{value}}>');
  assert.deepEqual(tokens, [
    startTag('input', [
      ['type', ['text'], [], true],
      ['value', [''], [{ expName: 'value', attributes: [] }], false]
    ])
  ]);
});

QUnit.test("tokens: expression", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("{{exp attr=value}}", { loc: true });
  assert.deepEqual(tokens, [
    locInfo(startExp("exp", [['attr', 'value', false, false]]), 1, 0, 1, 18)
  ]);
});

QUnit.test("tokens: char exp char", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("text{{exp attr=value}}text", { loc: true });
  assert.deepEqual(tokens, [
    locInfo(chars("text"), 1, 0, 1, 4),
    locInfo(startExp("exp", [['attr', 'value', false, false]]), 1, 4, 1, 22),
    locInfo(chars("text"), 1, 22, 1, 26)
  ]);
});

QUnit.test("tokens: startTag exp endTag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div>{{exp}}</div>", { loc: true });

  assert.deepEqual(tokens, [
    locInfo(startTag('div'), 1, 0, 1, 5),
    locInfo(startExp('exp'), 1, 5, 1, 12),
    locInfo(endTag('div'), 1, 12, 1, 18)
  ]);
});

function chars(s) {
  return {
    type: "Chars",
    chars: s || ""
  };
}

function comment(s) {
  return {
    type: "Comment",
    chars: s || ""
  };
}

function startTag(tagName, attributes, selfClosing) {
  return {
    type: "StartTag",
    tagName: tagName,
    attributes: attributes === undefined ? [] : attributes,
    selfClosing: selfClosing === undefined ? false : selfClosing,
  };
}

function endTag(tagName) {
  return {
    type: "EndTag",
    tagName: tagName
  };
}

function locInfo(token, startLine, startColumn, endLine, endColumn) {
  token.loc = {
    start: {
      line: startLine,
      column: startColumn
    },
    end: {
      line: endLine,
      column: endColumn
    }
  };

  return token;
}

function startExp(expName, attributes, isBlock) {
  var rtn = {
    type: "StartExp",
    expName: expName,
    attributes: attributes || [],
    block: isBlock || false
  };

  return rtn;
}

function endExp(expName) {
  return {
    type: "EndExp",
    expName: expName
  };
}
