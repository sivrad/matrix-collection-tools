import { readdirSync } from 'fs';
import { TYPE_FILES_PATH } from './constants';
import { Data } from './type';

export const getRootOptions = (options: Data): any => {
    while (
        !!options.name && // name is defined
        typeof options.name == 'function' && // name is a function
        options.name() != 'matrix'
    ) {
        options = options.parent as Data;
    }
    return options;
};

export const getDirectory = (cmd: unknown): string =>
    getRootOptions(cmd as Data)._optionValues.dir || './';

export const capitalize = (text: string): string =>
    text[0].toUpperCase() + text.substr(1, text.length);

export const formatAsLabel = (text: string): string =>
    text.split('_').map(capitalize).join(' ');

export const getTypeFiles = (directory: string): string[] =>
    readdirSync(`${directory}/${TYPE_FILES_PATH}`);
