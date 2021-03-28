// Script to lint ./collection.json and ./types/*.json
import { lint } from './lint';
import { CommanderStatic } from 'commander';
import { SchemaLintingError } from './error';

export default (program: CommanderStatic): void => {
    program
        .command('lint')
        .description('lint the JSON files.')
        .action(async () => {
            console.log('Linting JSON files...');
            try {
                await lint();
            } catch (e) {
                if (e instanceof SchemaLintingError) {
                    console.error(`!! ${e.name}: `);
                    console.error(`${e.message}`);
                } else {
                    console.error('UNKNOWN ERROR. PLEASE REPORT.');
                }
            }
        });
};
