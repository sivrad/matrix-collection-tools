import {
    MATRIX_SCHEMA_COLLECTION_URL,
    MATRIX_SCHEMA_TYPE_URL,
    TYPE_FILES_PATH,
    COLLECTION_FILE_PATH,
    SCHEMA_FILES,
} from './constants';
import { FileType } from './type';
import axios from 'axios';
import Ajv from 'ajv';
import {
    InvalidJSONSchema,
    FileNotFound,
    InvalidFileFormat,
    InvalidJSONSyntax,
} from './error';
import { existsSync, readdirSync, readFileSync } from 'fs';

const ajv = new Ajv();
let jsonSchemas: Record<string, unknown>[] = [];

const getSchemaURL = (type: FileType) =>
    ({
        collection: MATRIX_SCHEMA_COLLECTION_URL,
        type: MATRIX_SCHEMA_TYPE_URL,
    }[type]);

const getJSONSchemas = async () => {
    jsonSchemas = await Promise.all(SCHEMA_FILES.map(getRemoteSchema));
};

const getRemoteSchema = async (type: FileType) => {
    const url = getSchemaURL(type);
    return (await axios.get(url)).data;
};

const getSchema = (type: FileType) => jsonSchemas[SCHEMA_FILES.indexOf(type)];

const getTypeFromFilePath = (filePath: string): FileType => {
    if (filePath.includes('collection.json')) return 'collection';
    if (filePath.includes('.json')) return 'type';
    throw Error(`Unable to determine lint schema from '${filePath}'`);
};

const getFileContent = (filePath: string) => {
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (e) {
        if (e instanceof SyntaxError) {
            throw new InvalidJSONSyntax(filePath);
        } else {
            console.error('UNKNOWN ERROR: PLEASE REPORT');
            console.error(e);
            throw e;
        }
    }
};

const lintFile = (filePath: string): void => {
    const type = getTypeFromFilePath(filePath),
        data = getFileContent(filePath),
        schema = getSchema(type),
        validate = ajv.compile(schema);
    if (!validate(data)) throw new InvalidJSONSchema(filePath, validate.errors);
};

const getTypeFiles = () => readdirSync(TYPE_FILES_PATH);

const checkFileExistance = (filePath: string) => {
    if (!existsSync(filePath)) throw new FileNotFound(filePath);
};

const checkFileType = (filePath: string) => {
    if (filePath.substr(filePath.length - 5) != '.json')
        throw new InvalidFileFormat(filePath, 'json');
};

const lintFiles = async () => {
    await getJSONSchemas();
    // Check './collection.json'
    checkFileExistance(COLLECTION_FILE_PATH);
    // Lint  './collection.json'
    lintFile(COLLECTION_FILE_PATH);
    // Check './types/'
    checkFileExistance(TYPE_FILES_PATH);
    // Get   './types/*'
    const typeFiles = getTypeFiles();
    // Check & Lint './types/*.json';
    typeFiles.forEach((typeFile) => {
        typeFile = `${TYPE_FILES_PATH}${typeFile}`;
        checkFileType(typeFile);
        lintFile(typeFile);
    });
};

export const lint = async (): Promise<void> => {
    await lintFiles();
};
