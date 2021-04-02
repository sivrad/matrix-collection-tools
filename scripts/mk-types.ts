import { compile } from 'json-schema-to-typescript';
import axios from 'axios';
import { JSONSchema4 } from 'json-schema';
import { writeFileSync } from 'fs';

const TYPE_SCHEMA_URL =
    'https://raw.githubusercontent.com/sivrad/matrix-schema/main/type.json';

const getTypeSchema = async (): Promise<JSONSchema4> => {
    return (await axios.get(TYPE_SCHEMA_URL)).data;
};

const makeType = async () => {
    console.log('Making types...');
    const types = await compile(await getTypeSchema(), 'Type');
    writeFileSync('./src/generated_types.ts', types);
};

makeType();
