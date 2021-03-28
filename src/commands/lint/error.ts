import { ErrorObject } from 'ajv';

/**
 * Class to represent an invalid JSON schema.
 */
export class InvalidJSONSchema extends Error {
    /**
     * Constructor for an invalid JSON schema.
     * @param {ErrorObject[]} errors Errors from the validator.
     */
    constructor(public errors: undefined | null | ErrorObject[]) {
        super('Invalid JSON Schema');
        console.error(errors);
    }
}
