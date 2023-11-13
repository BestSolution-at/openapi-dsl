import { MonacoEditorLanguageClientWrapper } from './monaco-editor-wrapper/index.js';
import { buildWorkerDefinition } from "./monaco-editor-workers/index.js";
import monarchSyntax from "./syntaxes/open-api-sl.monarch.js";

buildWorkerDefinition('./monaco-editor-workers/workers', new URL('', window.location.href).href, false);

MonacoEditorLanguageClientWrapper.addMonacoStyles('monaco-editor-styles');

const client = new MonacoEditorLanguageClientWrapper();
const editorConfig = client.getEditorConfig();
editorConfig.setMainLanguageId('open-api-sl');

editorConfig.setMonarchTokensProvider(monarchSyntax);

editorConfig.setMainCode(`// OpenAPI SL is running in the web!`);

editorConfig.theme = 'vs-light';
editorConfig.useLanguageClient = true;
editorConfig.useWebSocket = false;

const workerURL = new URL('./open-api-sl-server-worker.js', import.meta.url);
console.log(workerURL.href);

const lsWorker = new Worker(workerURL.href, {
    type: 'classic',
    name: 'OpenApiSl Language Server'
});
lsWorker.addEventListener('message', e => {
    if( typeof e.data === 'string' ) {
        document.getElementById('openapi-content').innerHTML = e.data;
        document.getElementById('openapi-content').dataset.highlighted = "";
        
        hljs.highlightAll();
        const docs = document.getElementById('docs');
        docs.apiDescriptionDocument = e.data;
    }
})
client.setWorker(lsWorker);

// keep a reference to a promise for when the editor is finished starting, we'll use this to setup the canvas on load
const startingPromise = client.startEditor(document.getElementById("monaco-editor-root"));
