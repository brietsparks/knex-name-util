export type Alias<T> = keyof T;
export type AliasToPrefixedAliasLookup<T> = Record<Alias<T>, string>;
export type PrefixedAliasToAliasLookup<T> = Record<string, Alias<T>>;
export type AliasToPrefixedColumnLookup<T> = Record<Alias<T>, string>;
export type PrefixedAliasToPrefixedColumnLookup = Record<string, string>;

export type SelectionAliases<T> = ('*' | Alias<T>)[];

export type AliasedRow<T> = Record<Alias<T>, unknown>;

export interface KnexNameUtilConfig {
  columnDelimiter: string;
  rootAliasToColumn: Record<string, string>;
}

export class KnexNameUtil<T extends Record<string, string>> {

  private config: KnexNameUtilConfig;
  private readonly aliasToPrefixedAliasLookup: AliasToPrefixedAliasLookup<T>;
  private readonly prefixedAliasToAliasLookup: PrefixedAliasToAliasLookup<T>
  private readonly aliasToPrefixedColumnLookup: AliasToPrefixedColumnLookup<T>;
  private readonly prefixedAliasToPrefixedColumnLookup: PrefixedAliasToPrefixedColumnLookup;

  constructor(
    public tableName: string,
    private aliasToColumn: T,
    private aliasDelimiter: string = ':',
    config?: KnexNameUtilConfig,
  ) {
    this.config = config || {
      columnDelimiter: '.',
      rootAliasToColumn: aliasToColumn,
    };
    this.aliasToPrefixedAliasLookup = this.buildAliasToPrefixedAliasLookup(aliasToColumn);
    this.prefixedAliasToAliasLookup = this.buildPrefixedAliasToAliasLookup(aliasToColumn);
    this.aliasToPrefixedColumnLookup = this.buildAliasToPrefixedColumnLookup(aliasToColumn);
    this.prefixedAliasToPrefixedColumnLookup = this.buildPrefixedAliasToPrefixedColumnLookup(aliasToColumn);
  }

  get name() {
    return this.tableName;
  }

  wrap = (delimiter = ':') => {
    const aliasToAlias: Record<string, string> = {};
    for (const alias of Object.keys(this.aliasToColumn)) {
      aliasToAlias[alias] = alias;
    }

    return new KnexNameUtil(
      this.tableName,
      aliasToAlias,
      `${delimiter}${this.aliasDelimiter}`,
      {
        columnDelimiter: this.aliasDelimiter,
        rootAliasToColumn: this.aliasToColumn
      }
    );
  }

  select = (...aliases: SelectionAliases<T>) => {
    if (aliases[0] === '*') {
      return this.selectAll();
    }

    const selection: Partial<PrefixedAliasToPrefixedColumnLookup> = {};
    for (const alias of aliases) {
      const prefixedColumn = this.aliasToPrefixedColumnLookup[alias];
      if (prefixedColumn) {
        const prefixedAlias = this.getPrefixedAlias(alias as string);
        selection[prefixedAlias] = prefixedColumn;
      }
    }

    return selection;
  }

  selectAll = () => {
    return this.prefixedAliasToPrefixedColumnLookup;
  }

  insert = (row: Partial<AliasedRow<T>>): Record<string, unknown> => {
    const insertionRow: Record<string, unknown> = {};
    for (const [alias, value] of Object.entries(row)) {
      const column = this.aliasToColumn[alias];
      if (column) {
        insertionRow[column] = value;
      }
    }

    return insertionRow;
  }

  update = this.insert;

  prefixedAlias = (alias: keyof T) => {
    return this.aliasToPrefixedAliasLookup[alias];
  };

  column = (alias: Alias<T>) => {
    return this.aliasToPrefixedColumnLookup[alias];
  }

  joinOn = this.column;

  orderBy = this.column;

  whereIn = this.column;

  where = (aliases: Partial<Record<Alias<T>, unknown>>) => {
    // todo: ensure namings are consistent with the rest of the class
    const wherePredicate: Record<string, unknown> = {};
    for (const [alias, value] of Object.entries(aliases)) {
      const column = this.column(alias);
      if (column) {
        wherePredicate[column] = value;
      }
    }
    return wherePredicate;
  }

  toAlias = <U extends Partial<AliasedRow<T>>>(row: Record<string, unknown>) => {
    const aliasedRow: Partial<AliasedRow<T>> = {};
    for (const [prefixedAlias, value] of Object.entries(row)) {
      const alias = this.prefixedAliasToAliasLookup[prefixedAlias];
      if (alias) {
        aliasedRow[alias] = value;
      }
    }
    return aliasedRow as U;
  }

  toHashmap = <U extends Partial<AliasedRow<T>>>(key: (keyof U) | ((item: U) => string|number)) => {
    return (acc: Record<keyof U, U>, item: U): Record<string|number, U> => {
      const keyValue = (typeof key === 'function' ? key(item) : item[key]) as keyof U;
      acc[keyValue] = item;
      return acc;
    };
  }

  private buildAliasToPrefixedAliasLookup(aliasToColumnLookup: T): AliasToPrefixedAliasLookup<T> {
    const aliasToPrefixedAliasLookup: Partial<AliasToPrefixedAliasLookup<T>> = {};
    for (const alias of Object.keys(aliasToColumnLookup)) {
      aliasToPrefixedAliasLookup[alias as Alias<T>] = this.getPrefixedAlias(alias);
    }
    return aliasToPrefixedAliasLookup as AliasToPrefixedAliasLookup<T>;
  }

  private buildPrefixedAliasToAliasLookup(aliasToColumnLookup: T): PrefixedAliasToAliasLookup<T> {
    const aliasToPrefixedAliasLookup = this.buildAliasToPrefixedAliasLookup(aliasToColumnLookup);
    return invert(aliasToPrefixedAliasLookup);
  }

  private buildAliasToPrefixedColumnLookup(aliasToColumnLookup: T): AliasToPrefixedColumnLookup<T> {
    const aliasToPrefixedColumnLookup: Partial<AliasToPrefixedColumnLookup<T>> = {};
    for (const alias of Object.keys(aliasToColumnLookup)) {
      aliasToPrefixedColumnLookup[alias as Alias<T>] = this.getPrefixedColumn(alias);
    }
    return aliasToPrefixedColumnLookup as AliasToPrefixedColumnLookup<T>;
  }

  private buildPrefixedAliasToPrefixedColumnLookup(aliasToColumnLookup: T): PrefixedAliasToPrefixedColumnLookup {
    const prefixedAliasToPrefixedColumnLookup: Partial<PrefixedAliasToPrefixedColumnLookup> = {};
    for (const alias of Object.keys(aliasToColumnLookup)) {
      prefixedAliasToPrefixedColumnLookup[this.getPrefixedAlias(alias)] = this.getPrefixedColumn(alias);
    }
    return prefixedAliasToPrefixedColumnLookup as PrefixedAliasToPrefixedColumnLookup;
  }

  private getPrefixedAlias(alias: string) {
    return `${this.tableName}${this.aliasDelimiter}${alias}`;
  }

  private getPrefixedColumn(alias: string) {
    return `${this.tableName}${this.columnDelimiter}${this.aliasToColumn[alias]}`;
  }

  private get columnDelimiter() {
    return this.config.columnDelimiter;
  }
}

type Obj = { [key: string]: any };

function invert(obj: Obj): Obj {
  const result: Obj = {};

  for (const [key, value] of Object.entries(obj)) {
    result[value] = key;
  }

  return result;
}
