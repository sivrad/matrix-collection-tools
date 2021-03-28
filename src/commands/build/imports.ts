/**
 * Represent a set of imports for a file.
 */
export class Imports {
    private packages: Record<string, string[]> = {};

    /**
     * See if the imports contain a package.
     * @param {string} packageName The package name.
     * @returns {boolean} `true` if found.
     */
    has(packageName: string): boolean {
        return Object.keys(this.packages).includes(packageName);
    }

    /**
     * Add an import.
     * @param {string} packageName Package to import from.
     * @param {string} importName  The item being imported.
     * @returns {Imports} The imports instance.
     */
    add(packageName: string, importName: string): Imports {
        if (!this.has(packageName)) this.packages[packageName] = [];
        this.packages[packageName].push(importName);
        return this;
    }

    /**
     * Convert the imports to a string.
     * @returns {string} The imports as a string.
     */
    toString(): string {
        let imports = '';
        for (const packageName of Object.keys(this.packages)) {
            imports += `import { ${this.packages[packageName].join(
                ', ',
            )} } from '${packageName}';\n`;
        }
        return imports;
    }
}
