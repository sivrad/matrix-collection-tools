/**
 * Class to represent a build error.
 */
export class BuildError extends Error {
    /**
     * Contructor for a build error.
     * @param {string} name    Name of the error.
     * @param {string} message Message of the error.
     */
    constructor(public name: string, public message: string) {
        super(`${name}: ${message}`);
    }
}
