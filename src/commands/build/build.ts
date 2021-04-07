import { join } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { BUILT_IN_TYPES, SOURCE_DIRECTORY, TYPES_DIRECTORY } from './constants';
import { formatAsLabel, formatTable, getTypeFiles } from '../../util';
import { COLLECTION_FILE_PATH, TYPE_FILES_PATH } from '../../constants';
import { Type, Field, ObjectOf, Collection } from '../../type';
import { formatAsClassName } from './util';
import { Imports } from './packages';
import { exec } from 'child_process';

interface InternalField extends Field {
    required: boolean;
}
interface InternalType extends Type {
    fields: { [k: string]: InternalField };
}

/**
 * Builds the package.
 */
class Builder {
    private typeFiles: string[] = [];
    private schemas: ObjectOf<Type> = {};
    private sourcePath: string;
    private typesPath: string;
    private collection: Collection;

    /**
     * Constructor for the builder.
     * @param {string} directory The directory.
     */
    constructor(private directory: string) {
        this.typeFiles = this.getTypeFiles();
        this.sourcePath = join(this.directory, SOURCE_DIRECTORY);
        this.typesPath = join(this.directory, TYPES_DIRECTORY);
        this.collection = this.getCollection();
    }

    /**
     * Return the parent class name.
     * @param {string?} parent Parent class name.
     * @returns {[string, string]} Package, Class.
     */
    static getParentInfo(parent?: string): [string, string] {
        // If no parent is given.
        if (!parent) return ['@sivrad/matrix', 'MatrixBaseType'];
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
     * Return the collection schema.
     * @returns {string} Collection id.
     */
    getCollection(): Collection {
        // Read and parse collection.json.
        const collection = JSON.parse(
            readFileSync(join(this.directory, COLLECTION_FILE_PATH), 'utf-8'),
        );
        // Replace the icon if one is not given.
        collection['icon'] = collection.icon || 'OBAMA';
        return collection;
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
     * Creates './src/types/'.
     */
    createTypesDirectory() {
        if (!existsSync(this.typesPath)) mkdirSync(this.typesPath);
    }

    /**
     * Creates './src/index.ts'.
     */
    createIndexFile() {
        const indexFilePath = join(this.sourcePath, 'index.ts');
        writeFileSync(
            indexFilePath,
            `export * from './types';\nexport { collection } from './collection';`,
        );
    }

    /**
     * Create types index file.
     */
    createTypesIndexFile() {
        const indexFilePath = join(this.typesPath, 'index.ts');
        let indexFileContent = '';
        for (const schemaPath of Object.keys(this.schemas)) {
            const schema = this.schemas[schemaPath];
            const classNameFormat = formatAsClassName(schema.name);
            indexFileContent += `export { ${classNameFormat}, Serialized${classNameFormat} } from './${schema.name}';\n`;
        }
        writeFileSync(indexFilePath, indexFileContent);
    }

    /**
     * Creates './src/collection.ts'.
     */
    createCollectionFile() {
        const collectionPath = join(this.sourcePath, 'collection.ts');
        const imports = new Imports()
            .add('@sivrad/matrix', 'Collection')
            .set('./types', '* as types');
        writeFileSync(
            collectionPath,
            `${imports}
/*
 * The ${this.collection.label} Collection instance.
 */
export const collection = new Collection(
    '${this.collection.id}',
    '${this.collection.label}',
    '${this.collection.description}',
    '${this.collection.icon}',
    Object.values(types)
);`,
        );
    }

    /**
     * Get the schema.
     * @param {string} schemaPath Path to the schema.
     * @returns {InternalType} The type schema.
     */
    getSchema(schemaPath: string): InternalType {
        const typeSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
        const getField = (key: string, field: InternalField): InternalField => {
            return {
                type: field.type,
                label: field.label || formatAsLabel(key),
                description: field.description || 'No description given.',
                defaultValue: field.defaultValue || null,
                required: !Object.keys(field).includes('defaultValue'),
            };
        };
        return {
            name: typeSchema.name as string,
            label:
                (typeSchema.label as string) || formatAsLabel(typeSchema.name),
            description:
                (typeSchema.description as string) || 'No description given.',
            isAbstract: (typeSchema.isAbstract as boolean) || false,
            parent: typeSchema.parent as string,
            fields: Object.assign(
                {},
                ...Object.keys(typeSchema.fields || {}).map((k) => ({
                    [k]: getField(k, typeSchema.fields[k]),
                })),
            ),
        };
    }

    /**
     * Generate an interface field.
     * @param {string} key   Field key or name.
     * @param {Field}  field Field object.
     * @returns {string} Interface field.
     */
    generateInterfaceField(key: string, field: InternalField) {
        return `
    /**
     * ${field.description || formatAsLabel(key)}
     */
    ${key}${field.required ? '' : '?'}: ${field.type};\n`;
    }

    /**
     * Generate interface based off a schema.
     * @param {Type} schema The schema of the type.
     * @returns {string} The created interface.
     */
    generateSchemaInterface(schema: InternalType) {
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
     * @param {boolean} options.access The method access type.
     * @param {boolean} options.isAsync   If the method is async or not.
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
        options: {
            access?: 'public' | 'private' | 'protected';
            isAsync?: boolean;
        } = {
            access: 'public',
            isAsync: false,
        },
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
    ${options.access != 'public' ? `${options.access} ` : ''}${
            options.isAsync ? 'async ' : ''
        }${name}(${signature}): ${
            options.isAsync ? `Promise<${returns.type}>` : returns.type
        } {
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
                `Retrive the ${field.label} field.`,
                [],
                { type: field.type, description: field.description },
                `return this.getField<${field.type}>('${key}');`,
            ),
            setterMethod = this.generateMethod(
                `set${classNameFormat}`,
                `Set the ${field.label} field.`,
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
                `this.setField('${key}', value);`,
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
                access: 'private',
            },
        );
    }

    /**
     * Generate the `getTypeClass` method.
     * @param {string} className Name of the class to return.
     * @returns {string} The `getTypeClass` method.
     */
    generateGetTypeClassMethod(className: string): string {
        return this.generateMethod(
            'getTypeClass',
            'Get the class of the type.',
            [],
            {
                type: `typeof ${className}`,
                description: 'The type class.',
            },
            `return ${className};`,
            {
                access: 'protected',
            },
        );
    }

    /**
     * Isolate a type into seperate types.
     * @param   {string}   type The type expression.
     * @returns {string[]}      An array of types.
     */
    isolateFieldTypes(type: string): string[] {
        type = type.replace(/ /g, '');
        return type.split('|').map((t) => t.replace(/\[\]/g, ''));
    }

    /**
     * Import all external types from the fields of a type.
     * @param {InternalType} schema  The schema.
     * @param {Imports}      imports The imports instance.
     */
    importExternalFieldTypes(schema: InternalType, imports: Imports): void {
        for (const [, field] of Object.entries(schema.fields)) {
            const types = this.isolateFieldTypes(field.type).filter(
                (type) =>
                    BUILT_IN_TYPES.indexOf(type) == -1 && type != schema.name,
            );
            for (const typeName of types) {
                const typeNameParts = typeName.split('.');
                const [pkg, type] =
                    typeNameParts.length == 2
                        ? [
                              `@sivrad/matrix-collection-${typeNameParts[0]}`,
                              typeNameParts[1],
                          ]
                        : ['.', typeName];
                imports.add(pkg, type);
            }
        }
    }

    /**
     * Generates the type class file content.
     * @param {Type} schema The schema of the type.
     * @returns {void}
     */
    generateTypeClass(schema: InternalType) {
        // Get the package parent info.
        const [packageName, parentName] = Builder.getParentInfo(schema.parent);
        // Set the imports.
        const imports = new Imports().add(
            packageName,
            parentName,
            'Field',
            `Serialized${parentName}`,
        );
        // Import all the external field types.
        this.importExternalFieldTypes(schema, imports);
        // Get the class name.
        const className = formatAsClassName(schema.name);
        const serializedClassName = `Serialized${className}`;

        const methods = [this.generateGetTypeClassMethod(className)].concat(
            Object.keys(schema.fields).map((key) => {
                return this.generateFieldMethods(key, schema.fields[key]);
            }),
        );

        let serializedSchemaInterface, classFields;

        if (Object.keys(schema.fields || {}).length > 0) {
            serializedSchemaInterface = `/**
 * Serialized ${schema.label}.
 */
export interface ${serializedClassName} extends Serialized${parentName} {${this.generateSchemaInterface(
                schema,
            )}}`;
            classFields = `{\n${Object.keys(schema.fields)
                .map(
                    (key) => `        ${key}: {
            type: '${schema.fields[key].type}',
            label: '${schema.fields[key].label}',
            description: '${schema.fields[key].description}',
            defaultValue: ${
                typeof schema.fields[key].defaultValue == 'string'
                    ? `'${schema.fields[key].defaultValue}'`
                    : schema.fields[key].defaultValue
            },
            required: ${schema.fields[key].required}
        },`,
                )
                .join('\n')}\n    }`;
        } else {
            serializedSchemaInterface = `export type ${serializedClassName} = SerializedMatrixBaseType;`;
            classFields = '{}';
        }

        return `${imports.toString()}
${serializedSchemaInterface}

/**
 * Matrix Type ${schema.label}.
 * 
 * ${schema.description}
 */
export class ${className} extends ${parentName} {
    static classFields: Record<string, Field> = ${classFields};
    public static _classInformation = {
        name: '${schema.name}',
        label: '${schema.label}',
        description: '${schema.description}',
        icon: '',
    };

    /**
     * Contructor for the ${schema.label}.
     * @param {${serializedClassName}} data Serialized data.
     */
    constructor(data: ${serializedClassName}) {
        super(data);
    }
    
${methods.join('\n')}
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
            join(this.directory, TYPES_DIRECTORY, `${schema.name}.ts`),
            fileContent,
        );
    }

    /**
     * Builds the package.
     */
    async build() {
        console.log('Building package');
        this.createSourceDirectory();
        this.createTypesDirectory();
        this.typeFiles.forEach((file) =>
            this.buildType(join(this.directory, TYPE_FILES_PATH, file)),
        );
        this.createIndexFile();
        this.createTypesIndexFile();
        this.createCollectionFile();
        // TODO: make this better
        // await this.addDependencies();
        console.log('Package built!');
    }
}

export const build = async (directory: string): Promise<void> => {
    await new Builder(directory).build();
};
