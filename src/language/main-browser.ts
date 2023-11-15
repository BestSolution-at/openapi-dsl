import { DocumentState, EmptyFileSystem, startLanguageServer } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser.js';
import { createOpenApiSlServices } from './open-api-sl-module.js';
import { Model } from './generated/ast.js';
import { generateJSONContent } from '../cli/json-generate.js';


declare const self: DedicatedWorkerGlobalScope;

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

const { shared } = createOpenApiSlServices({ connection, ...EmptyFileSystem });

startLanguageServer(shared);

let workerPort: MessagePort;

self.addEventListener('message', e => {
    if( e.data === 'connect' ) {
        workerPort = e.ports[0];
    }
});

shared.workspace.DocumentBuilder.onBuildPhase( DocumentState.Validated, docs => {
    const model = docs[0].parseResult.value as Model;
    const jsonContent = generateJSONContent(model);

    const apiDocJSON = { openAPIDocument: jsonContent };

    if( workerPort ) {
        workerPort.postMessage(apiDocJSON);
        console.log('Posted message');
    } else {
        console.error('No port available');
    }
    
} )
