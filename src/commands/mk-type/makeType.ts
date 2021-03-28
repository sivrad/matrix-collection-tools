import { TYPE_FILES_PATH, MATRIX_SCHEMA_TYPE_URL } from '../../constants';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { DuplicateType } from './error';
import { formatAsLabel } from '../../util';

const createTypesDirectory = (path: string) => {
    if (!existsSync(path)) mkdirSync(path);
};

export const makeType = (name: string, directory: string): void => {
    const fileName = `${name}.json`,
        typesDirectory = join(directory, TYPE_FILES_PATH),
        newTypePath = join(typesDirectory, fileName);
    // Check for duplicates
    if (existsSync(newTypePath)) throw new DuplicateType(name);
    // Create './types/' if not found
    createTypesDirectory(typesDirectory);
    // Create the object.
    const typeObject = {
        $schema: MATRIX_SCHEMA_TYPE_URL,
        name: name,
        label: formatAsLabel(name),
    };
    writeFileSync(newTypePath, JSON.stringify(typeObject, null, 4));
    console.log(`New type '${name}' created!`);
};
