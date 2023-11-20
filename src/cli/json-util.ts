import { CompositeGeneratorNode, IndentNode, NL, toString } from "langium";

export function toJSONString(object: object) {
    const node = new CompositeGeneratorNode();
    generate(node, object)
    return toString(node);
}

function generate(node: CompositeGeneratorNode, object: object) {
    
    if( Array.isArray(object) ) {
        node.append('[', NL)
        node.indent( content => {
            const filtered = object.filter(isValueSerialiable)
            filtered.forEach( (e, idx) => generateValue(content, e, idx + 1 == filtered.length) );
        } )
        node.append(']')
        return;
    }

    node.append('{', NL)
    node.indent( body => {
        generateProperties(body, object as Record<string, unknown>)
    } )
    node.append('}')
}

type Serializable = boolean | number | object | string | null;

function isEntrySerializable(entry: { key: string, value: unknown }): entry is { key: string, value: Serializable } {
    return isValueSerialiable(entry.value);
}

function isValueSerialiable(value: unknown): value is Serializable {
    return value === null 
        || typeof value === 'boolean' 
        || typeof value === 'number'
        || typeof value === 'object'
        || typeof value === 'string';
}

function generateProperties(node: IndentNode, object: Record<string, unknown>) {
    const values = Object.keys(object)
        .map( k => ({ key: k, value: object[k] }))
        .filter(isEntrySerializable);

    values.forEach( (e, idx) => {
        node.append(`"${e.key}": `)
        generateValue(node, e.value, idx + 1 == values.length)
    } )
}

function generateValue(node: IndentNode, value: Serializable, last: boolean) {
    if( value === null || typeof value === 'boolean' || typeof value === 'number' ) {
        node.append(`${value}`);
    } else if( typeof value === 'object' ) {
        generate(node, value)
    } else if( typeof value === 'string' ) {
        node.append(`"${jsonSaveString(value)}"`)
    }
    if( ! last ) {
        node.append(',')
    }
    node.append(NL)
}

function jsonSaveString(value: string) {
    return value.split(/\r?\n/)
        .map( l => l.trim().replaceAll('"', '\\"') )
        .join('\\n');
}
