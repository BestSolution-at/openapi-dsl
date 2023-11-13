import { type Model } from '../language/generated/ast.js';
import * as fs from 'node:fs';

import * as path from 'node:path';
import { extractDestinationAndName } from './cli-util.js';
import { generateJSONContent } from './json-generate.js';

export function generateJavaScript(model: Model, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.json`;

    const content = generateJSONContent(model);

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }
    fs.writeFileSync(generatedFilePath, content);
    
    return generatedFilePath;

}

