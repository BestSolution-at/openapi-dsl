import { MonacoEditorLanguageClientWrapper } from './monaco-editor-wrapper/index.js';
import { buildWorkerDefinition } from "./monaco-editor-workers/index.js";
import monarchSyntax from "./syntaxes/open-api-sl.monarch.js";

buildWorkerDefinition('./monaco-editor-workers/workers', new URL('', window.location.href).href, false);

MonacoEditorLanguageClientWrapper.addMonacoStyles('monaco-editor-styles');

const client = new MonacoEditorLanguageClientWrapper();
const editorConfig = client.getEditorConfig();
editorConfig.setMainLanguageId('open-api-sl');

editorConfig.setMonarchTokensProvider(monarchSyntax);

editorConfig.setMainCode(`// OpenAPI SL is running in the web!
meta {
    openapi: '3.0.1'
    info: {
        version: '1.0.0'
        title: 'Simple DSL Demo'
        description: 'Samples for all features of OpenAPI DSL'
        termsOfService: 'http://swagger.io/terms/'
        contact: {
            name: 'BestSolution.at'
            email: 'info@bestsolution.at'
            url: 'https://github.com/BestSolution-at/openapi-dsl'
        }
        license: {
            name: 'MIT'
        }
    }
    servers: [
        {
            url: "http://localhost:8080"
        }
    ]
}

types {
    alias LIMIT = integer(int32)(0,100]
    alias WEIGHT = number(double)(0,1000]

    type NewPet {
        name: string
        weight: WEIGHT
    }
    type Pet extends NewPet {
        id: int64
    }

    type Error {
        code: int32
        message: string
    }
}

endpoints {
    PetResource at '/pets' {
        '' {
            get findPets(query limit?: LIMIT) =>
                200: array<Pet,100>
                default: Error
            post createPet(body pet: NewPet) =>
                200: Pet
                default: Error
        }
        '/{id}' {
            get findPetById(path id: int64) =>
                200
                default: Error
            delete deletePet(path id: string) =>
                204
                default: Error
        }
    }
}
`);

editorConfig.theme = 'vs-light';
editorConfig.useLanguageClient = true;
editorConfig.useWebSocket = false;

const messageChannel = new MessageChannel();
const workerURL = new URL('./open-api-sl-server-worker.js', import.meta.url);

const lsWorker = new Worker(workerURL.href, {
    type: 'classic',
    name: 'OpenApiSl Language Server'
});
lsWorker.postMessage('connect', [messageChannel.port1])
messageChannel.port2.onmessage = (e) => {
    if( isOpenAPIMessage(e.data) ) {
        document.getElementById('openapi-content').innerHTML = e.data.openAPIDocument;
        document.getElementById('openapi-content').dataset.highlighted = "";
        
        hljs.highlightAll();
        const docs = document.getElementById('docs');
        docs.apiDescriptionDocument = e.data.openAPIDocument;
    }
};

client.setWorker(lsWorker);

// keep a reference to a promise for when the editor is finished starting, we'll use this to setup the canvas on load
const startingPromise = client.startEditor(document.getElementById("monaco-editor-root"));

function isOpenAPIMessage(data) {
    return typeof data === 'object' 
        && 'openAPIDocument' in data
        && typeof data.openAPIDocument === 'string'
}