import { KnexNameUtil } from '..';

const table = new KnexNameUtil('my_table', {
  col: 'col',
  myColumn: 'my_column',
});

describe('KnexNameUtil', () => {
  describe('select', () => {
    test('wildcard', () => {
      expect(table.select('*')).toEqual({
        'my_table:col': 'my_table.col',
        'my_table:myColumn': 'my_table.my_column',
      });
    });

    test('specified columns', () => {
      expect(table.select( 'myColumn')).toEqual({
        'my_table:myColumn': 'my_table.my_column',
      });

      expect(table.select( 'col', 'myColumn')).toEqual({
        'my_table:col': 'my_table.col',
        'my_table:myColumn': 'my_table.my_column',
      });
    });
  });

  test('insert', () => {
    expect(table.insert({
      'myColumn': 'foo',
      'col': 'bar'
    })).toEqual({
      'my_column': 'foo',
      'col': 'bar'
    });
  });

  test('where', () => {
    expect(table.where({
      'myColumn': 'foo',
      'col': 'bar'
    })).toEqual({
      'my_table.my_column': 'foo',
      'my_table.col': 'bar',
    })
  });

  test('toAlias', () => {
    const row = {
      'my_table:col': 'foo',
      'my_table:myColumn': 'bar',
    };

    const aliased = table.toAlias(row);

    expect(aliased).toEqual({
      'col': 'foo',
      'myColumn': 'bar',
    });
  });

  describe('toHashmap', () => {
    interface Item {
      id: string;
      col: string;
      myColumn: string;
    }

    const aliasedArray = [
      {
        'id': 'a',
        'col': 'foo',
        'myColumn': 'bar',
      }
    ];

    const expected = {
      'a': {
        'id': 'a',
        'col': 'foo',
        'myColumn': 'bar',
      }
    };

    test('key from string', () => {
      const hashmap = aliasedArray.reduce(table.toHashmap<Item>('id'), {});
      expect(hashmap).toEqual(expected);
    });

    test('key from function', () => {
      const hashmap = aliasedArray.reduce(table.toHashmap<Item>(item => item.id), {});
      expect(hashmap).toEqual(expected);
    });
  });

  describe('wrap', () => {
    describe('select', () => {
      test('wildcard', () => {
        expect(table.wrap().select('*')).toEqual({
          'my_table::col': 'my_table:col',
          'my_table::myColumn': 'my_table:myColumn',
        });
      });

      test('specified columns', () => {
        expect(table.wrap().select( 'myColumn')).toEqual({
          'my_table::myColumn': 'my_table:myColumn',
        });

        expect(table.wrap().select( 'col', 'myColumn')).toEqual({
          'my_table::col': 'my_table:col',
          'my_table::myColumn': 'my_table:myColumn',
        });
      });
    });

    test('where', () => {
      expect(table.wrap().where({
        'myColumn': 'foo',
        'col': 'bar'
      })).toEqual({
        'my_table:myColumn': 'foo',
        'my_table:col': 'bar'
      });
    });

    test('toAlias', () => {
      const row = table.wrap().toAlias({
        'my_table::col': 'foo',
        'my_table::myColumn': 'bar',
      });

      expect(row).toEqual({
        'col': 'foo',
        'myColumn': 'bar',
      });
    });
  });
});

