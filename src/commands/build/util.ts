import { capitalize } from '../../util';

export const formatAsClassName = (name: string): string =>
    name
        .split('-')
        .map((str) => capitalize(str))
        .join('');
