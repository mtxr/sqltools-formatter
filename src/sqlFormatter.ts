import Db2Formatter from './languages/Db2Formatter';
import N1qlFormatter from './languages/N1qlFormatter';
import PlSqlFormatter from './languages/PlSqlFormatter';
import StandardSqlFormatter from './languages/StandardSqlFormatter';
import { Config, Token } from './core/types';

export default {
  /**
   * Format whitespaces in a query to make it easier to read.
   *
   * @param {string} query
   * @param {Config} cfg
   *  @param {string} cfg.language Query language, default is Standard SQL
   *  @param {string} cfg.indent Characters used for indentation, default is "  " (2 spaces)
   *  @param {string} cfg.reservedWordCase Reserverd case change. Allowed upper, lower, null. Default null (no changes).
   *  @param {any} cfg.params Collection of params for placeholder replacement
   * @return {string}
   */
  format: (query: string, cfg: Config = {}): string => {
    switch (cfg.language) {
      case 'db2':
        return new Db2Formatter(cfg).format(query);
      case 'n1ql':
        return new N1qlFormatter(cfg).format(query);
      case 'pl/sql':
        return new PlSqlFormatter(cfg).format(query);
      case 'sql':
      case undefined:
        return new StandardSqlFormatter(cfg).format(query);
      default:
        throw Error(`Unsupported SQL dialect: ${cfg.language}`);
    }
  },

  /**
   * Tokenize query.
   *
   * @param {string} query
   * @param {Config} cfg
   *  @param {string} cfg.language Query language, default is Standard SQL
   * @return {Token[]}
   */
  tokenize: (query: string, cfg: Config = {}): Token[] => {
    cfg = cfg || {};

    switch (cfg.language) {
      case 'db2':
        return new Db2Formatter(cfg).tokenize(query);
      case 'n1ql':
        return new N1qlFormatter(cfg).tokenize(query);
      case 'pl/sql':
        return new PlSqlFormatter(cfg).tokenize(query);
      case 'sql':
      case undefined:
        return new StandardSqlFormatter(cfg).tokenize(query);
      default:
        throw Error(`Unsupported SQL dialect: ${cfg.language}`);
    }
  },
};
