const { expect } = require('chai');
const { knex } = require('../../src/persistence/baseRepository');

describe('baseRepository.test', () => {
  before('before', () => {

    Repository = new Repository({
      pkName: 'sid',
      builder: knex,
      tableName: 'temp',
    });
  });

  after('after', () => {

    knex.destroy();
  });
  it('when test', async () => {
    const expected = '';
    const actual = '';
    expect(actual).to.equal(expected);
  });
});
