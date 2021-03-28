import { SCHEMA_FILES } from './constants';

export type FileType = typeof SCHEMA_FILES[number];

export type ObjectOf<T> = Record<string, T>;

export type Data = ObjectOf<unknown>;
