const Knex = require('knex');

/**
 * @template TRecord, TResult
 */
class BaseRepository {

  /**
   * @param {{
   *  builder: Knex<TRecord, TResult = TRecord[]>.QueryBuilder;
   *  tableName: string;
   *  pkName: string;
   *  options: {};
   * }} props
   */
  constructor({
    builder,
    tableName,
    entity,
    pkName,
    options,
  }) {

    this.builder = builder;
    this.tableName = tableName;
    this.entity = entity;
    this.options = options || {
      strictModel: false,
    };
    this.pkName = pkName;
  }

  /**
   * @returns {Knex.QueryBuilder}
   */
  get model() {
    return this.builder(this.tableName);
  }

  getPk(entity) {

    if (this.pkName && entity) {
      return entity[this.pkName] || shortid.generate();
    }

    return undefined;
  }

  // eslint-disable-next-line class-methods-use-this
  deleteAndInsertMany(rows, { key }) {

    const arr = rows.map(d => d[key]);
    return {
      then: async cb => {
        await this.deleteIn(key, arr);
        await this.insertMany(rows);
        return cb();
      },
      transacting: async trx => {
        await this.deleteIn(key, arr).transacting(trx);
        await this.insertMany(rows).transacting(trx);
        return Promise.resolve(true);
      },
    };
  }

  /**
   * @param {TRecord} where
   * @returns {Promise<TResult>}
   */
  findLastOneBy(where) {
    return this.retrieveBy(where)
      .orderBy([
        {
          column: 'createdAt',
          order: 'DESC',
        },
      ])
      .limit(1)
      .then(r => r[0]);
  }

  /**
   * @param {TRecord} where
   * @returns {Promise<TResult>}
   */
  findLastOne() {
    return this.retrieve()
      .orderBy([
        {
          column: 'createdAt',
          order: 'DESC',
        },
      ])
      .limit(1)
      .then(r => r[0]);
  }

  /**
   * @param {TRecord} where
   * @returns {Promise<TResult>}
   */
  async findUniqueBy(where) {
    const result = await this.retrieveBy(where);
    if (result.length === 0) {
      throw new Error(`not found where: ${where}`);
    }
    if (result.length > 1) {
      throw new Error(`There are more than one which is ${where}`);
    }

    return result[0];
  }

  /**
   * @param {string | number} pk
   * @returns {Promise<TResult>}
   */
  async findByPk(pk) {

    const pkName = this.pkName || 'id';
    return this.model.where({ [pkName]: pk }).first();
  }

  /**
   * @param {TRecord} values
   * @returns {Knex.QueryBuilder}
   */
  insert(values) {

    if (this.options && this.options.strictModel && !(values instanceof this.entity)) {
      throw new Error('Invalid State. Wrong model');
    }

    const tuple = this.getTuple(values);
    return this.model.insert(tuple);
  }

  /**
   * @returns {Knex.QueryBuilder<TRecord, TResult[]>}
   */
  retrieve() {
    return this.model.select();
  }

  /**
   * @param {TRecord} where
   * @template TRecord2
   * @returns {Knex.QueryBuilder<TRecord, TResult[]>}
   */
  retrieveBy(where) {
    return this.model.select().where(where);
  }

  retrieveByNot(where) {
    return this.model.select().whereNot(where);
  }

  retrieveIn(column, arr) {
    return this.model.select().whereIn(column, arr);
  }

  getTuple(values) {

    const pk = this.getPk(values);
    this[this.pkName] = pk;

    return pk
      ? {
        ...values,
        [this.pkName]: pk,
      }
      : values;
  }

  insertMany(rows) {

    if (this.options && this.options.strictModel && !(rows instanceof this.entity)) {
      throw new Error('Invalid State. Wrong model');
    }

    const tuples = rows.map(row => this.getTuple(row));
    return this.model.insert(tuples);
  }

  deleteBy(where) {

    return this.model.where(where).del();
  }

  deleteIn(column, arr) {

    return this.model.whereIn(column, arr).del();
  }

  groupBy(column) {

    return this.model.select().count().groupBy(column);
  }

  count(column) {

    return this.model.count(column || '*');
  }

  /**
   * @deprecated
   * @param {{condition, data}} param0
   */
  update({ condition, data }) {
    const set = {
      ...data,
      updatedAt: data.updatedAt || new Date(),
    };
    return this.model.update(set).where(condition);
  }

  updateBy({ condition, data }) {
    const set = {
      ...data,
      updatedAt: data.updatedAt || new Date(),
    };
    return this.model.update(set).where(condition);
  }

  updateMany(rows, keyName) {

    return Promise.all(rows.map(r =>
      this.updateBy({
        condition: { [keyName]: r[keyName] },
        data: r,
      }),
    ));
  }

  async upsertMany(rows, keyName) {
    const keys = rows.map(row => row[keyName]);

    const result = await this.retrieveIn(keyName, keys);
    const resultMapByKey = _.groupBy(result, keyName);

    const { toUpdate, toInsert } = rows.reduce(
      (acc, curr) => {
        if (resultMapByKey[curr[keyName]]) {
          return {
            toInsert: acc.toInsert,
            toUpdate: [
              ...acc.toUpdate,
              curr,
            ],
          };
        }
        return {
          toInsert: [
            ...acc.toInsert,
            curr,
          ],
          toUpdate: acc.toUpdate,
        };
      },
      {
        toInsert: [],
        toUpdate: [],
      },
    );

    return Promise.all([
      this.insertMany(toInsert),
      this.updateMany(toUpdate, 'sid'),
    ]);
  }
}

exports.BaseRepository = BaseRepository;
