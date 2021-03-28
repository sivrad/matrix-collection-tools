import { Data } from './type';

export const getSyntaxErrorDetails = (
    message: string,
    content: string,
): [string, number, number] => {
    const AT_POSITION = ' at position ';
    if (!message.includes(AT_POSITION)) return [message, 0, 0];
    const reason = message.split(' in JSON ')[0];
    const positionTarget = parseInt(message.split(AT_POSITION)[1]);
    const lines = content.split('\n');
    let [line, column, position] = [0, 0, 1];
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        line++;
        const lineContent = lines[lineNumber];
        const characters = lineContent.split('');
        for (
            let columnNumber = 0;
            columnNumber < characters.length;
            columnNumber++
        ) {
            position++;
            column++;
            if (position == positionTarget) {
                return [reason, line, column];
            }
        }
        column = 0;
    }
    throw Error('doesnt work');
};

export const getRootOptions = (options: Data): any => {
    while (
        !!options.name && // name is defined
        typeof options.name == 'function' && // name is a function
        options.name() != 'matrix'
    ) {
        options = options.parent as Data;
    }
    return options;
};

export const getDirectory = (cmd: unknown): string =>
    getRootOptions(cmd as Data)._optionValues.dir || './';
