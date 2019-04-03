import sqlFormatter from "../src/sqlFormatter";
import behavesLikeSqlFormatter from "./behavesLikeSqlFormatter";

describe("Db2Formatter", function() {
    behavesLikeSqlFormatter("db2");

    it("formats FETCH FIRST like LIMIT", function() {
        expect(sqlFormatter.format(
            "SELECT col1 FROM tbl ORDER BY col2 DESC FETCH FIRST 20 ROWS ONLY;",
            {language: "db2"}
        )).toBe(
            "SELECT\n" +
            "  col1\n" +
            "FROM\n" +
            "  tbl\n" +
            "ORDER BY\n" +
            "  col2 DESC\n" +
            "FETCH FIRST\n" +
            "  20 ROWS ONLY;"
        );
    });

    it("formats only -- as a line comment", function() {
        const result = sqlFormatter.format(
            "SELECT col FROM\n" +
            "-- This is a comment\n" +
            "MyTable;\n",
            {language: "db2"}
        );
        expect(result).toBe(
            "SELECT\n" +
            "  col\n" +
            "FROM\n" +
            "  -- This is a comment\n" +
            "  MyTable;"
        );
    });

    it("recognizes @ and # as part of identifiers", function() {
        const result = sqlFormatter.format(
            "SELECT col#1, @col2 FROM tbl\n",
            {language: "db2"}
        );
        expect(result).toBe(
            "SELECT\n" +
            "  col#1,\n" +
            "  @col2\n" +
            "FROM\n" +
            "  tbl"
        );
    });

    it("recognizes :variables", function() {
        expect(sqlFormatter.format("SELECT :variable;", {language: "db2"})).toBe(
            "SELECT\n" +
            "  :variable;"
        );
    });

    it("replaces :variables with param values", function() {
        const result = sqlFormatter.format(
            "SELECT :variable",
            {language: "db2", params: {"variable": "\"variable value\""}}
        );
        expect(result).toBe(
            "SELECT\n" +
            "  \"variable value\""
        );
    });
});

describe('Db2Formatter tokenizer', () => {
  it('tokenizes simple select', function() {
    const result = sqlFormatter.tokenize('SELECT col FROM\n' + 'MyTable;\n', { language: 'db2' });
    expect(result).toEqual([
      { type: 'reserved-toplevel', value: 'SELECT' },
      { type: 'whitespace', value: ' ' },
      { type: 'word', value: 'col' },
      { type: 'whitespace', value: ' ' },
      { type: 'reserved-toplevel', value: 'FROM' },
      { type: 'whitespace', value: '\n' },
      { type: 'tablename', value: 'MyTable' },
      { type: 'operator', value: ';' },
      { type: 'whitespace', value: '\n' },
    ]);
  });
});
