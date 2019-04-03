import sqlFormatter from '../src/sqlFormatter';

describe('sqlFormatter', function() {
  it('throws error when unsupported language parameter specified', function() {
    expect(() => {
      sqlFormatter.format('SELECT *', { language: 'blah' });
    }).toThrow('Unsupported SQL dialect: blah');
    expect(() => {
      sqlFormatter.tokenize('SELECT *', { language: 'blah' });
    }).toThrow('Unsupported SQL dialect: blah');
  });
});
