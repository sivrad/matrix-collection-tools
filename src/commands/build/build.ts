import { join } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { SOURCE_DIRECTORY } from './constants';
import { formatAsLabel, formatTable, getTypeFiles } from '../../util';
import { COLLECTION_FILE_PATH, TYPE_FILES_PATH } from '../../constants';
import { Type, Field, ObjectOf } from '../../type';
import { formatAsClassName } from './util';
import { Imports } from './imports';
import { exec } from 'child_process';

/**
 * Builds the package.
 */
class Builder {
    private typeFiles: string[] = [];
    private schemas: ObjectOf<Type> = {};
    private sourcePath: string;
    private collectionID: string;

    /**
     * Constructor for the builder.
     * @param {string} directory The directory.
     */
    constructor(private directory: string) {
        this.typeFiles = this.getTypeFiles();
        this.sourcePath = join(this.directory, SOURCE_DIRECTORY);
        this.collectionID = this.getCollectionID();
    }

    /**
     * Return the parent class name.
     * @param {string?} parent Parent class name.
     * @returns {[string, string]} Package, Class.
     */
    static getParentInfo(parent?: string): [string, string] {
        // If no parent is given.
        if (!parent) return ['./base', 'MatrixBaseType'];
        // If no '.'
        if (!parent.includes('.')) return [`.`, formatAsClassName(parent)];
        // Remote package.
        const parentParts = parent.split('.');
        return [
            `@sivrad/matrix-collection-${parentParts[0]}`,
            formatAsClassName(parentParts[1]),
        ];
    }

    /**
     * Return the collection id.
     * @returns {string} Collection id.
     */
    getCollectionID(): string {
        return JSON.parse(
            readFileSync(join(this.directory, COLLECTION_FILE_PATH), 'utf-8'),
        ).id;
    }

    /**
     * Return all the files in './types/'.
     * @returns {string[]} All the files.
     */
    getTypeFiles() {
        return getTypeFiles(this.directory);
    }

    /**
     * Creates './src/'.
     */
    createSourceDirectory() {
        if (!existsSync(this.sourcePath)) mkdirSync(this.sourcePath);
    }

    /**
     * Creates './src/index.ts'.
     */
    createIndexFile() {
        const indexFilePath = join(this.sourcePath, 'index.ts');
        let indexFileContent = '';
        for (const schemaPath of Object.keys(this.schemas)) {
            const schema = this.schemas[schemaPath];
            indexFileContent += `export { ${formatAsClassName(
                schema.name,
            )} } from './${schema.name}';`;
        }
        writeFileSync(indexFilePath, indexFileContent);
    }

    /**
     * Get the schema.
     * @param {string} schemaPath Path to the schema.
     * @returns {Type} The type schema.
     */
    getSchema(schemaPath: string): Type {
        const typeSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
        return {
            name: typeSchema.name as string,
            label:
                (typeSchema.label as string) || formatAsLabel(typeSchema.name),
            description:
                (typeSchema.description as string) || 'No description given.',
            isAbstract: (typeSchema.isAbstract as boolean) || false,
            parent: typeSchema.parent as string,
            fields: (typeSchema.fields as Record<string, Field>) || {},
        };
    }

    /**
     * Generate an interface field.
     * @param {string} key   Field key or name.
     * @param {Field}  field Field object.
     * @returns {string} Interface field.
     */
    generateInterfaceField(key: string, field: Field) {
        const isOptional = false;
        return `
    /**
     * ${field.description || formatAsLabel(key)}
     */
    ${key}${isOptional ? '?' : ''}: ${field.type};\n`;
    }

    /**
     * Generate interface based off a schema.
     * @param {Type} schema The schema of the type.
     * @returns {string} The created interface.
     */
    generateSchemaInterface(schema: Type) {
        const fields = schema.fields || {};
        let interfaceContent = '';
        for (const key of Object.keys(fields)) {
            interfaceContent += this.generateInterfaceField(key, fields[key]);
        }
        return interfaceContent;
    }

    /**
     * Generate a method from a template.
     * @param {string} name Name of the method.
     * @param {string} description Description of the method.
     * @param {{name: string, type: string, description: string}[]} args A list of args objects.
     * @param {obj} returns An returns object.
     * @param {string} returns.type Type of the argument.
     * @param {string} returns.description Description of the arugment.
     * @param {string} code The method code.
     * @param {string} options An object of options.
     * @param {boolean} options.isPrivate If the method is private or not.
     * @returns {string} The method code.
     */
    generateMethod(
        name: string,
        description: string,
        args: {
            name: string;
            type: string;
            description: string;
        }[],
        returns: {
            type: string;
            description: string;
        },
        code: string,
        options = { isPrivate: false },
    ): string {
        const signature = args
            .map((arg) => `${arg.name}: ${arg.type}`)
            .join(', ');

        const argTable =
            args.length == 0
                ? []
                : // Create an arg table for the parms.
                  args.map((arg) => [
                      '     * @param',
                      `{${arg.type}}`,
                      arg.name,
                      arg.description,
                  ]);
        // Add the returns to the table.
        argTable.push([
            '     * @returns',
            `{${returns.type}}`,
            '',
            returns.description,
        ]);
        return `    /**
     * ${description}
${formatTable(argTable)}
     */
    ${
        options.isPrivate ? 'private ' : ''
    }async ${name}(${signature}): Promise<${returns.type}> {
        ${code}
    }`;
    }

    /**
     * Generates the methods for a field.
     * @param {string} key   The name of the field.
     * @param {Field}  field The field object.
     * @returns {string} The methods needed for a field.
     */
    generateFieldMethods(key: string, field: Field): string {
        const classNameFormat = formatAsClassName(key),
            getterMethod = this.generateMethod(
                `get${classNameFormat}`,
                `Retrive the properties (replace with label) ${key}.`,
                [],
                { type: field.type, description: field.description },
                `return this.getField('${key}');`,
            ),
            setterMethod = this.generateMethod(
                `set${classNameFormat}`,
                `Set the ${key} field.`,
                [
                    {
                        name: 'value',
                        type: field.type,
                        description: 'The value to set.',
                    },
                ],
                {
                    type: 'void',
                    description: '',
                },
                `await this.setField("${key}", value);`,
            );

        return [getterMethod, setterMethod].join('\n');
    }

    /**
     * Generates the `getField` method.
     * @returns {string} The `getField` method.
     */
    generateGetFieldMethod(): string {
        return this.generateMethod(
            'getField',
            'Get a field from the thing.',
            [
                {
                    name: 'fieldName',
                    type: 'string',
                    description: 'The name of the field to retrive.',
                },
            ],
            {
                type: 'any',
                description: 'The returned value of the field.',
            },
            'return await this.data[key];',
            {
                isPrivate: true,
            },
        );
    }

    /**
     * Generates the type class file content.
     * @param {Type} schema The schema of the type.
     * @returns {void}
     */
    generateTypeClass(schema: Type) {
        const [packageName, parentName] = Builder.getParentInfo(schema.parent);
        const imports = new Imports().add(packageName, parentName);
        const className = formatAsClassName(schema.name);
        const serializedClassName = `Serialized${className}`;

        const methods = Object.keys(schema.fields)
            .map((key) => {
                return this.generateFieldMethods(key, schema.fields[key]);
            })
            .join('\n');

        return `${imports.toString()}
${
    Object.keys(schema.fields || {}).length > 0
        ? `/**
 * Serialized ${schema.label}.
 */
export interface ${serializedClassName} {${this.generateSchemaInterface(
              schema,
          )}}`
        : `export type ${serializedClassName} = Record<string, never>;`
}

/**
 * Matrix Type ${schema.label}.
 * 
 * ${schema.description}
 */
export class ${className} extends ${parentName} {
    /**
     * Contructor for the ${schema.label}.
     * @param {${serializedClassName}} data Serialized data.
     */
    constructor(data: ${serializedClassName}) {
        super(data);
    }
    
${methods}
}`;
    }

    /**
     * Add dependencies from parents.
     */
    async addDependencies() {
        const packages: Set<string> = new Set();
        for (const schema of Object.values(this.schemas)) {
            const [pkg] = Builder.getParentInfo(schema.parent);
            if (
                ['.', '@sivrad/matrix-collection'].indexOf(pkg) == -1 &&
                !packages.has(pkg)
            )
                packages.add(pkg);
        }
        const newPackages = [...packages].join(' ');
        if (!newPackages) return;
        const installCommand = `yarn add ${newPackages} --cwd ${this.directory}`;
        try {
            exec(installCommand, (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    return;
                }
                console.log(`stdout: ${stdout}`);
            });
        } catch (e) {
            console.error(e);
            throw e;
        }

        // const packageJSON = JSON.parse(readFileSync(join(this.directory, 'package.json'), 'utf-8'));
    }

    /**
     * Creates './src/<type>.ts'.
     * @param {string} schemaPath Path to the schema.
     */
    buildType(schemaPath: string) {
        const schema = this.getSchema(schemaPath);
        this.schemas[schemaPath] = schema;
        const fileContent = this.generateTypeClass(schema);
        writeFileSync(
            join(this.directory, SOURCE_DIRECTORY, `${schema.name}.ts`),
            fileContent,
        );
    }

    /**
     * Builds the package.
     */
    async build() {
        console.log('Building package');
        this.createSourceDirectory();
        this.typeFiles.forEach((file) =>
            this.buildType(join(this.directory, TYPE_FILES_PATH, file)),
        );
        this.createIndexFile();
        // TODO: make this better
        // await this.addDependencies();
        console.log('Package built!');
    }
}

export const build = async (directory: string): Promise<void> => {
    await new Builder(directory).build();
};
