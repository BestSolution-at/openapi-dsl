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
        description: 'The Project contains a sample DSL
        
        # Introduction

        This is an API documented in **OpenAPI format** created using
        the [Open API DSL](https://bestsolution-at.github.io/openapi-dsl)
        '
        termsOfService: 'http://bestsolution.at/terms/'
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
    alias WHEELS = integer(int32)(0,4]
    alias WEIGHT = number(double)(0,10000]
    alias SEATS = integer(int32)[2,6]

    type BaseVehicle {
        _type: string -- descriminator used to differentiate vehicles
        numberOfWheels: WHEELS -- number of wheels
        weight: WEIGHT -- the weight in KG
    }

    type Car(_type) extends BaseVehicle {
        seats: SEATS    -- number of seats
    }

    type Bicycle(_type) extends BaseVehicle {
        frontGearWheels: int32 -- number of front gears
        backGearWheels: int32 -- number of back gears
    }

    union Vehicle = Car | Bicycle

    type Error {
        code: int32
        message: string
    }
}

endpoints {
    PetResource at '/vehicles' {
        '' {
            /-
            | Get all vehicles
            | 
            | @param limit maximum number of items
            -/
            get list(query limit?: LIMIT) =>
                200: array<Vehicle,100>
                default: Error
            /-
            | Create a new vehicle
            | 
            | @param vehicle the vehicle to add
            -/
            post create(body vehicle: Vehicle) =>
                200: Vehicle
                default: Error
        }
        '/{id}' {
            /-
            | Get a vehicle by ID
            -/
            get fetch(path id: int64) =>
                200
                default: Error
            /-
            | Remove a vehicle by ID
            -/
            delete remove(path id: int64) =>
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