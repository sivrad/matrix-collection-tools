#!/usr/bin/env node
import * as program from 'commander';
import { VERSION } from './constants';
import * as commands from './commands';

// Program info.
program
    .name('matrix')
    .version(VERSION, '-v', 'output the matrix-tools version');
// Apply all the functions to the program.
for (const func of Object.values(commands)) func(program);

program.parse(process.argv);
