// Script create a new type.
import { CommanderStatic } from 'commander';
import { makeType } from './makeType';
import { getDirectory } from '../../util';
import { TypeCreationError } from './error';

export default (program: CommanderStatic): void => {
    program
        .command('mk-type <name>')
        .description('create a new type.')
        .action((name: string, _, cmd: unknown) => {
            try {
                makeType(name, getDirectory(cmd));
            } catch (e) {
                if (e instanceof TypeCreationError) {
                    console.error(`${e.toString()}`);
                } else {
                    console.error('UNKNOWN ERROR. PLEASE REPORT.');
                }
            }
        });
};
