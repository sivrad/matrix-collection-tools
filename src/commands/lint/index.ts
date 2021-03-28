// Script to lint ./collection.json and ./types/*.json
import { lint } from './lint';
import { CommanderStatic } from 'commander';
import { SchemaLintingError } from './error';
import { getDirectory } from './util';

export default (program: CommanderStatic): void => {
    program
        .command('lint')
        .description('lint the JSON files.')
        .action(async (_, cmd: unknown) => {
            console.log('Linting JSON files...');
            try {
                await lint(getDirectory(cmd));
            } catch (e) {
                if (e instanceof SchemaLintingError) {
                    console.error(`${e.toString()}`);
                } else {
                    console.error('UNKNOWN ERROR. PLEASE REPORT.');
                    throw e;
                }
            }
        });
};
