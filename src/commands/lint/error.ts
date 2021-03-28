import { ErrorObject } from 'ajv';

/**
 * Class to represent a schema linting error.
 */
export class SchemaLintingError extends Error {
    /**
     * Constructor for the schema linting error.
     * @param {string} name Name of the error.
     * @param {string} message Message of the error.
     */
    constructor(public name: string, public message: string) {
        super(`${name}: ${message}`);
    }
}

/**
 * Class to represent an invalid JSON schema.
 */
export class InvalidJSONSchema extends SchemaLintingError {
    /**
     * Constructor for an invalid JSON schema.
     * @param {string} filePath The path of the invalid file.
     * @param {ErrorObject[]} errors Errors from the validator.
     */
    constructor(
        public filePath: string,
        public errors: undefined | null | ErrorObject[],
    ) {
        super(
            'InvalidJSONSchema',
            `Invalid schema in file: '${filePath}'.\nReason: ${
                Array.isArray(errors) && errors.length > 0
                    ? errors[0].message
                    : 'Unknown'
            }`,
        );
    }
}

/**
 * Class to represent an invalid file format error.
 */
export class InvalidFileFormat extends SchemaLintingError {
    /**
     * Constructor for an invalid file format.
     * @param {string} filePath Path to the invalid file.
     * @param {string} requiredFileType The required file type.
     */
    constructor(public filePath: string, public requiredFileType: string) {
        super(
            'InvalidFileFormat',
            `'${filePath}' must be of file type: '.${requiredFileType}'`,
        );
    }
}

/**
 * Class to represent a file not found error.
 */
export class FileNotFound extends SchemaLintingError {
    /**
     * Constructor for a file not found error.
     * @param {string} filePath Path to the file that was not found.
     */
    constructor(public filePath: string) {
        super(
            filePath.includes('.') ? 'FileNotFound' : 'DirectoryNotFound',
            `'${filePath}' does not exist.`,
        );
    }
}

/**
 * Class to represent an invalid json syntax error.
 */
export class InvalidJSONSyntax extends SchemaLintingError {
    /**
     * Constructor for an invalid json syntax error.
     * @param {string} filePath Path to the invalid syntax file.
     */
    constructor(public filePath: string) {
        super('InvalidJSONSyntax', `Invalid JSON in file: '${filePath}'.`);
    }
}
