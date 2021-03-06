import { SCHEMA_FILES } from './constants';
import {
    TYPE_FILES_PATH,
    MATRIX_SCHEMA_COLLECTION_URL,
    MATRIX_SCHEMA_TYPE_URL,
    COLLECTION_FILE_PATH,
} from '../../constants';
import { FileType } from './type';
import axios from 'axios';
import Ajv from 'ajv';
import {
    InvalidJSONSchema,
    FileNotFound,
    InvalidFileFormat,
    InvalidJSONSyntax,
    NoInternetConnection,
} from './error';
import { existsSync, readFileSync } from 'fs';
import { getSyntaxErrorDetails } from './util';
import { getTypeFiles } from '../../util';

const ajv = new Ajv({
    allowUnionTypes: true,
});
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
    try {
        return (await axios.get(url)).data;
    } catch (e) {
        if (e instanceof Error) {
            if (e.message.includes('getaddrinfo'))
                throw new NoInternetConnection();
            throw e;
        }
    }
};

const getSchema = (type: FileType) => jsonSchemas[SCHEMA_FILES.indexOf(type)];

const getTypeFromFilePath = (filePath: string): FileType => {
    if (filePath.includes('collection.json')) return 'collection';
    if (filePath.includes('.json')) return 'type';
    throw Error(`Unable to determine lint schema from '${filePath}'`);
};

const getFileContent = (filePath: string) => {
    const content = readFileSync(filePath, 'utf-8');
    try {
        return JSON.parse(content);
    } catch (e) {
        if (e instanceof SyntaxError) {
            const [reason, line, column] = getSyntaxErrorDetails(
                e.message,
                content,
            );
            throw new InvalidJSONSyntax(filePath, reason, line, column);
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

const checkFileExistance = (filePath: string) => {
    if (!existsSync(filePath)) throw new FileNotFound(filePath);
};

const makePath = (directory: string, filePath: string) =>
    `${
        directory.substr(directory.length - 1) == '/'
            ? directory
            : `${directory}/`
    }${filePath}`;

const checkFileType = (filePath: string) => {
    if (filePath.substr(filePath.length - 5) != '.json')
        throw new InvalidFileFormat(filePath, 'json');
};

const lintFiles = async (directory: string) => {
    await getJSONSchemas();
    // Function to the relative path
    const path = (filePath: string) => makePath(directory, filePath);
    // Check './collection.json'
    checkFileExistance(path(COLLECTION_FILE_PATH));
    // Lint  './collection.json'
    lintFile(path(COLLECTION_FILE_PATH));
    // Check './types/'
    checkFileExistance(path(TYPE_FILES_PATH));
    // Get   './types/*'
    const typeFiles = getTypeFiles(directory);
    // Check & Lint './types/*.json';
    typeFiles.forEach((typeFile) => {
        typeFile = `${path(TYPE_FILES_PATH)}${typeFile}`;
        checkFileType(typeFile);
        lintFile(typeFile);
    });
    // Success message
    console.log('Lint completed!');
};

export const lint = async (directory: string): Promise<void> => {
    await lintFiles(directory);
};
