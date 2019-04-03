import isEmpty from 'lodash/isEmpty';
import escapeRegExp from 'lodash/escapeRegExp';
import { TokenTypes, Token, TokenizerConfig } from './types';

export default class Tokenizer {
  public WHITESPACE_REGEX: RegExp;
  public NUMBER_REGEX: RegExp;
  public OPERATOR_REGEX: RegExp;
  public BLOCK_COMMENT_REGEX: RegExp;
  public LINE_COMMENT_REGEX: RegExp;
  public RESERVED_TOPLEVEL_REGEX: RegExp;
  public RESERVED_NEWLINE_REGEX: RegExp;
  public RESERVED_PLAIN_REGEX: RegExp;
  public WORD_REGEX: RegExp;
  public TABLE_NAME_REGEX: RegExp;
  public TABLE_NAME_PREFIX_REGEX: RegExp;
  public STRING_REGEX: RegExp;
  public OPEN_PAREN_REGEX: RegExp;
  public CLOSE_PAREN_REGEX: RegExp;
  public INDEXED_PLACEHOLDER_REGEX: RegExp;
  public IDENT_NAMED_PLACEHOLDER_REGEX: RegExp;
  public STRING_NAMED_PLACEHOLDER_REGEX: RegExp;

  /**
   * @param {TokenizerConfig} cfg
   *  @param {string[]} cfg.reservedWords Reserved words in SQL
   *  @param {string[]} cfg.reservedToplevelWords Words that are set to new line separately
   *  @param {string[]} cfg.reservedNewlineWords Words that are set to newline
   *  @param {string[]} cfg.stringTypes String types to enable: "", '', ``, [], N''
   *  @param {string[]} cfg.openParens Opening parentheses to enable, like (, [
   *  @param {string[]} cfg.closeParens Closing parentheses to enable, like ), ]
   *  @param {string[]} cfg.indexedPlaceholderTypes Prefixes for indexed placeholders, like ?
   *  @param {string[]} cfg.namedPlaceholderTypes Prefixes for named placeholders, like @ and :
   *  @param {string[]} cfg.lineCommentTypes Line comments to enable, like # and --
   *  @param {string[]} cfg.specialWordChars Special chars that can be found inside of words, like @ and #
   */
  constructor(cfg: TokenizerConfig) {
    this.WHITESPACE_REGEX = /^(\s+)/;
    this.NUMBER_REGEX = /^((-\s*)?[0-9]+(\.[0-9]+)?|0x[0-9a-fA-F]+|0b[01]+)\b/;
    this.OPERATOR_REGEX = /^(!=|<>|==|<=|>=|!<|!>|\|\||::|->>|->|~~\*|~~|!~~\*|!~~|~\*|!~\*|!~|.)/;

    this.BLOCK_COMMENT_REGEX = /^(\/\*[^]*?(?:\*\/|$))/;
    this.LINE_COMMENT_REGEX = this.createLineCommentRegex(cfg.lineCommentTypes);

    this.RESERVED_TOPLEVEL_REGEX = this.createReservedWordRegex(cfg.reservedToplevelWords);
    this.RESERVED_NEWLINE_REGEX = this.createReservedWordRegex(cfg.reservedNewlineWords);
    this.RESERVED_PLAIN_REGEX = this.createReservedWordRegex(cfg.reservedWords);
    this.TABLE_NAME_PREFIX_REGEX = this.createReservedWordRegex(cfg.tableNamePrefixWords);

    this.WORD_REGEX = this.createWordRegex(cfg.specialWordChars);
    this.TABLE_NAME_REGEX = /([a-z][\w\.]*|[\[`][a-z][\w\. \-]*[\]`])/i;
    this.STRING_REGEX = this.createStringRegex(cfg.stringTypes);

    this.OPEN_PAREN_REGEX = this.createParenRegex(cfg.openParens);
    this.CLOSE_PAREN_REGEX = this.createParenRegex(cfg.closeParens);

    this.INDEXED_PLACEHOLDER_REGEX = this.createPlaceholderRegex(cfg.indexedPlaceholderTypes, '[0-9]*');
    this.IDENT_NAMED_PLACEHOLDER_REGEX = this.createPlaceholderRegex(cfg.namedPlaceholderTypes, '[a-zA-Z0-9._$]+');
    this.STRING_NAMED_PLACEHOLDER_REGEX = this.createPlaceholderRegex(
      cfg.namedPlaceholderTypes,
      this.createStringPattern(cfg.stringTypes)
    );
  }

  createLineCommentRegex(lineCommentTypes) {
    return new RegExp(`^((?:${lineCommentTypes.map(c => escapeRegExp(c)).join('|')}).*?(?:\n|$))`);
  }

  createReservedWordRegex(reservedWords) {
    const reservedWordsPattern = reservedWords.join('|').replace(/ /g, '\\s+');
    return new RegExp(`^(${reservedWordsPattern})\\b`, 'i');
  }

  createWordRegex(specialChars = []) {
    return new RegExp(`^([\\w${specialChars.join('')}]+)`);
  }

  createStringRegex(stringTypes) {
    return new RegExp('^(' + this.createStringPattern(stringTypes) + ')');
  }

  // This enables the following string patterns:
  // 1. backtick quoted string using `` to escape
  // 2. square bracket quoted string (SQL Server) using ]] to escape
  // 3. double quoted string using "" or \" to escape
  // 4. single quoted string using '' or \' to escape
  // 5. national character quoted string using N'' or N\' to escape
  createStringPattern(stringTypes) {
    const patterns = {
      '``': '((`[^`]*($|`))+)',
      '[]': '((\\[[^\\]]*($|\\]))(\\][^\\]]*($|\\]))*)',
      '""': '(("[^"\\\\]*(?:\\\\.[^"\\\\]*)*("|$))+)',
      "''": "(('[^'\\\\]*(?:\\\\.[^'\\\\]*)*('|$))+)",
      "N''": "((N'[^N'\\\\]*(?:\\\\.[^N'\\\\]*)*('|$))+)",
    };

    return stringTypes.map(t => patterns[t]).join('|');
  }

  createParenRegex(parens) {
    return new RegExp('^(' + parens.map(p => this.escapeParen(p)).join('|') + ')', 'i');
  }

  escapeParen(paren) {
    if (paren.length === 1) {
      // A single punctuation character
      return escapeRegExp(paren);
    } else {
      // longer word
      return '\\b' + paren + '\\b';
    }
  }

  createPlaceholderRegex(types, pattern) {
    if (isEmpty(types)) {
      return null;
    }
    const typesRegex = types.map(escapeRegExp).join('|');

    return new RegExp(`^((?:${typesRegex})(?:${pattern}))`);
  }

  /**
   * Takes a SQL string and breaks it into tokens.
   * Each token is an object with type and value.
   *
   * @param {string} input The SQL string
   * @return {Object[]} tokens An array of tokens.
   *  @return {string} token.type
   *  @return {string} token.value
   */
  tokenize(input: string): Token[] {
    const tokens = [];
    let token: Token;

    // Keep processing the string until it is empty
    while (input.length) {
      // Get the next token and the token type
      token = this.getNextToken(input, this.getPreviousToken(tokens), this.getPreviousToken(tokens, 1));
      // Advance the string
      input = input.substring(token.value.length);

      tokens.push(token);
    }
    return tokens;
  }

  getNextToken(input: string, tokenMinus1?: Token, tokenMinus2?: Token): Token {
    return (
      this.getWhitespaceToken(input) ||
      this.getCommentToken(input) ||
      this.getStringToken(input) ||
      this.getOpenParenToken(input) ||
      this.getCloseParenToken(input) ||
      this.getPlaceholderToken(input) ||
      this.getNumberToken(input) ||
      this.getReservedWordToken(input, tokenMinus1) ||
      this.getTableNameToken(input, tokenMinus1, tokenMinus2) ||
      this.getWordToken(input) ||
      this.getOperatorToken(input)
    );
  }

  getWhitespaceToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.WHITESPACE,
      regex: this.WHITESPACE_REGEX,
    });
  }

  getCommentToken(input: string): Token {
    return this.getLineCommentToken(input) || this.getBlockCommentToken(input);
  }

  getLineCommentToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.LINE_COMMENT,
      regex: this.LINE_COMMENT_REGEX,
    });
  }

  getBlockCommentToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.BLOCK_COMMENT,
      regex: this.BLOCK_COMMENT_REGEX,
    });
  }

  getStringToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.STRING,
      regex: this.STRING_REGEX,
    });
  }

  getOpenParenToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.OPEN_PAREN,
      regex: this.OPEN_PAREN_REGEX,
    });
  }

  getCloseParenToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.CLOSE_PAREN,
      regex: this.CLOSE_PAREN_REGEX,
    });
  }

  getPlaceholderToken(input: string): Token {
    return (
      this.getIdentNamedPlaceholderToken(input) ||
      this.getStringNamedPlaceholderToken(input) ||
      this.getIndexedPlaceholderToken(input)
    );
  }

  getIdentNamedPlaceholderToken(input: string): Token {
    return this.getPlaceholderTokenWithKey({
      input,
      regex: this.IDENT_NAMED_PLACEHOLDER_REGEX,
      parseKey: v => v.slice(1),
    });
  }

  getStringNamedPlaceholderToken(input: string): Token {
    return this.getPlaceholderTokenWithKey({
      input,
      regex: this.STRING_NAMED_PLACEHOLDER_REGEX,
      parseKey: v => this.getEscapedPlaceholderKey({ key: v.slice(2, -1), quoteChar: v.slice(-1) }),
    });
  }

  getIndexedPlaceholderToken(input: string): Token {
    return this.getPlaceholderTokenWithKey({
      input,
      regex: this.INDEXED_PLACEHOLDER_REGEX,
      parseKey: v => v.slice(1),
    });
  }

  getPlaceholderTokenWithKey({ input, regex, parseKey }) {
    const token = this.getTokenOnFirstMatch({ input, regex, type: TokenTypes.PLACEHOLDER });
    if (token) {
      token.key = parseKey(token.value);
    }
    return token;
  }

  getEscapedPlaceholderKey({ key, quoteChar }) {
    return key.replace(new RegExp(escapeRegExp('\\') + quoteChar, 'g'), quoteChar);
  }

  // Decimal, binary, or hex numbers
  getNumberToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.NUMBER,
      regex: this.NUMBER_REGEX,
    });
  }

  // Punctuation and symbols
  getOperatorToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.OPERATOR,
      regex: this.OPERATOR_REGEX,
    });
  }

  getReservedWordToken(input, previousToken) {
    // A reserved word cannot be preceded by a "."
    // this makes it so in "mytable.from", "from" is not considered a reserved word
    if (previousToken && previousToken.value && previousToken.value === '.') {
      return;
    }
    return (
      this.getToplevelReservedToken(input) || this.getNewlineReservedToken(input) || this.getPlainReservedToken(input)
    );
  }

  getTableNameToken(input, tokenMinus1, tokenMinus2) {
    if (tokenMinus1 && tokenMinus1.value && tokenMinus1.value.trim() !== '') {
      return;
    }
    if (tokenMinus2 && tokenMinus2.value && !this.TABLE_NAME_PREFIX_REGEX.test(tokenMinus2.value)) {
      return;
    }

    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.TABLENAME,
      regex: this.TABLE_NAME_REGEX,
    });
  }

  getToplevelReservedToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.RESERVED_TOPLEVEL,
      regex: this.RESERVED_TOPLEVEL_REGEX,
    });
  }

  getNewlineReservedToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.RESERVED_NEWLINE,
      regex: this.RESERVED_NEWLINE_REGEX,
    });
  }

  getPlainReservedToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.RESERVED,
      regex: this.RESERVED_PLAIN_REGEX,
    });
  }

  getWordToken(input: string): Token {
    return this.getTokenOnFirstMatch({
      input,
      type: TokenTypes.WORD,
      regex: this.WORD_REGEX,
    });
  }

  getTokenOnFirstMatch({ input, type, regex }: { input: string; type: TokenTypes; regex: RegExp }): Token {
    const matches = input.match(regex);

    if (matches) {
      return { type, value: matches[1] };
    }
  }

  getPreviousToken(tokens: Token[], offset = 0) {
    return tokens[tokens.length - offset - 1] || { value: null, type: null };
  }
}
