// Script to lint ./collection.json and ./types/*.json
import { lint } from './lint';
import { CommanderStatic } from 'commander';

export default (program: CommanderStatic): void => {
    program
        .command('lint')
        .description('lint the JSON files.')
        .action(async () => {
            console.log('Linting JSON files...');
            await lint();
        });
};
