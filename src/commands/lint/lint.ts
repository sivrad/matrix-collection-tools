import {
    MATRIX_SCHEMA_COLLECTION_URL,
    MATRIX_SCHEMA_TYPE_URL,
    TYPE_FILES_PATH,
    COLLECTION_FILE_PATH,
} from './constants';
import { FileType } from './type';
import axios from 'axios';
import Ajv from 'ajv';
import { InvalidJSONSchema } from './error';
import { readdirSync, readFileSync } from 'fs';

const ajv = new Ajv();

const getSchemaURL = (type: FileType) =>
    ({
        collection: MATRIX_SCHEMA_COLLECTION_URL,
        type: MATRIX_SCHEMA_TYPE_URL,
    }[type]);

const getSchema = async (type: FileType) => {
    const url = getSchemaURL(type);
    return (await axios.get(url)).data;
};

const getTypeFromFilePath = (filePath: string): FileType => {
    if (filePath.includes('collection.json')) return 'collection';
    if (filePath.includes('types/')) return 'type';
    throw Error(`Unable to determine lint schema from '${filePath}'`);
};

const getFileContent = (filePath: string) => {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
};

const lintFile = async (filePath: string): Promise<void> => {
    const type = getTypeFromFilePath(filePath),
        data = getFileContent(filePath),
        schema = await getSchema(type),
        validate = ajv.compile(schema);
    if (!validate(data)) throw new InvalidJSONSchema(validate.errors);
};

const getTypeFiles = () => readdirSync(TYPE_FILES_PATH);

const lintFiles = async () => {
    lintFile(COLLECTION_FILE_PATH);
    getTypeFiles().forEach(lintFile);
};

export const lint = async (): Promise<void> => {
    await lintFiles;
};
