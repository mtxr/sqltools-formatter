/**
 * Constants for token types
 */
export enum TokenTypes {
  WHITESPACE = 'whitespace',
  WORD = 'word',
  STRING = 'string',
  RESERVED = 'reserved',
  RESERVED_TOPLEVEL = 'reserved-toplevel',
  RESERVED_NEWLINE = 'reserved-newline',
  OPERATOR = 'operator',
  OPEN_PAREN = 'open-paren',
  CLOSE_PAREN = 'close-paren',
  LINE_COMMENT = 'line-comment',
  BLOCK_COMMENT = 'block-comment',
  NUMBER = 'number',
  PLACEHOLDER = 'placeholder',
  TABLENAME = 'tablename',
}
export interface Config {
  language?: string;
  indent?: string;
  reservedWordCase?: string;
  params?: Object;
}

export interface Token {
  type: TokenTypes;
  value: string;
  key?: string;
}
