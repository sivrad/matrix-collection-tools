/**
 * Class to represent a type creation error.
 */
export class TypeCreationError extends Error {
    /**
     * Contructor for a type creation error.
     * @param {string} name    Name of the error.
     * @param {string} message Message of the error.
     */
    constructor(public name: string, public message: string) {
        super(`${name}: ${message}`);
    }
}

/**
 * Class to represent a duplicate type error.
 */
export class DuplicateType extends TypeCreationError {
    /**
     * Constructor for a duplicate type.
     * @param {string} typeName The name of the type.
     */
    constructor(public typeName: string) {
        super(
            'DuplicateType',
            `A type with the name '${typeName}' already exists`,
        );
    }
}
