#!/usr/bin/env node

import * as program from 'commander';
import { VERSION } from './constants';
import * as commands from './commands';

// Program info.
program
    .name('matrix')
    .version(VERSION, '-v', 'output the matrix-tools version')
    .option('--dir <directory>', 'use a specified directory', '.');
// Apply all the functions to the program.
for (const func of Object.values(commands)) func(program);

// Parse args.
program.parse(process.argv);
