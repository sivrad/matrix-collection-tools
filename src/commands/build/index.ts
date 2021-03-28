// Script to build the package.
import { CommanderStatic } from 'commander';
import { getDirectory } from '../../util';
import { BuildError } from './error';
import { build } from './build';

export default (program: CommanderStatic): void => {
    program
        .command('build')
        .description('build the package.')
        .action(async (_, cmd: unknown) => {
            try {
                await build(getDirectory(cmd));
            } catch (e) {
                if (e instanceof BuildError) {
                    console.error(`${e.toString()}`);
                } else {
                    console.error('UNKNOWN ERROR. PLEASE REPORT.');
                    throw e;
                }
            }
        });
};
