import { Endpoint, isModelType, isStringLiteral, ValueType, type Model, type ModelType, UnionType, isValueType, isUnionType, Property, isBuiltinStringFormats, isBuiltinIntegerFormats, isAlias, TypeDef, isBuiltinFloatFormats, isPrimitiveFloats, isPrimitiveIntegers, Parameter, Type, ModelValue, Path, Operation, isCustomType, Response, CustomType } from '../language/generated/ast.js';

import { toJSONString } from './json-util.js';

export function generateOpenAPIJSONContent(model: Model): string {
    const result : Record<string, unknown> = {};

    if( model.model ) {
        recursiveModel(model.model, result);
    }

    if( model.endpoints.length > 0 ) {
        result['paths'] = endpoints(model.endpoints)
    }

    if( model.types.length > 0 ) {
        result['components'] = {
            schemas: schemas(model.types)
        }
    }

    return toJSONString(result);
}

function schemas(types: CustomType[]) {
    const result: Record<string, unknown> = {}
    types.forEach( t => {
        if( isValueType(t) ) {
            result[t.name] = valueType(t);
        } else if( isUnionType(t) ) {
            result[t.name] = unionType(t);
        }
        
    } )
    return result;
}

function valueType(type: ValueType) {
    if( type.parents.length > 0 ) {
        const result : Record<string, unknown> = {}
        const arr : unknown[] = []
        result['allOf'] = arr;
        type.parents.forEach( p => {
            if( p.ref ) {
                arr.push( { '$ref': `#/components/schemas/${p.ref.name}` })
            }
        } )
        arr.push(objectType(type))
        return result;
    } else {
        return objectType(type);
    }
}

function objectType(type: ValueType) {
    const result: Record<string, unknown> = {
        type: 'object',
        properties: properties(type)
    }
    return result;
}

function properties(type: ValueType) {
    const result: Record<string, unknown> = {}
    if( type.descriminator ) {
        result[type.descriminator] = {
            type: 'string'
        }
    }
    type.properties.forEach( p => {
        result[p.name] = property(p)
    })
    return result;
}

function property(p: Property) {
    if( p.type.array ) {
        const result: Record<string, unknown> = {}
        if( p.doc ) {
            const doc = parseAPIDoc(p.doc);
            result['description'] = `${doc.summary ? doc.summary + ' ' + doc.description : doc.description}`
        }    
        result['type'] = 'array'
        result['items'] = typeDef(p.type.typeDef)
        return result;
    } else {
        const result = typeDef(p.type.typeDef)
        if( p.doc ) {
            const doc = parseAPIDoc(p.doc);
            result['description'] = `${doc.summary ? doc.summary + ' ' + doc.description : doc.description}`
        }
        return result;
    }
}

function unionType(t: UnionType) {
    const oneOf : unknown[] = []
    t.types.forEach( t => {
        oneOf.push( { '$ref': `#/components/schemas/${t.ref?.name}` })
    })

    return {
        oneOf
    }
}

function endpoints(endpoints: Endpoint[]) {
    const result : Record<string, unknown> = {};

    endpoints.forEach( e => {
        e.paths.forEach( p => {
            result[`${e.path}${p.path}`] = path(p)
        })
    });

    return result;
}

function path(path: Path) {
    const result : Record<string,unknown> = {}
    path.operations.forEach( op => {
        result[op.type] = operation(op);
    } )

    return result;
}

function operation(op: Operation) {
    const result : Record<string,unknown> = {}
    result['operationId'] = op.name;
    if( op.doc ) {
        const doc = parseAPIDoc(op.doc)
        if( doc.summary ) {
            result['summary'] = doc.summary
        }
        result['description'] = doc.description
    }
    const params = op.parameters.filter( p => p.in !== 'body')
    if( params.length > 0 ) {
        result['parameters'] = parameters(params)
    }
    const body = op.parameters.find( p => p.in === 'body' );
    if( body ) {
        result['requestBody'] = {
            content: {
                'application/json': {
                    schema: schema(body.type)
                }
            }
        }
    }

    result['responses'] = responses(op.respones);

    return result;
}

function parameters(params: Parameter[]) {
    return params.map(parameter)
}

function parameter(param: Parameter) {
    const result: Record<string, unknown> = {
        name: param.name,
        in: param.in
    };
    if( param.in === 'path' || param.optional === false ) {
        result['required'] = true
    }

    result['schema'] = schema(param.type)

    return result;
}

function responses(resps: Response[]) {
    const result : Record<string, unknown> = {}

    resps.forEach( r => {
        result[`${r.code}`] = response(r)

    } )

    return result;
}

function response(resp: Response) {
    const result : Record<string, unknown> = {
        description: 'TBD'
    }
    if( resp.type ) {
        result['content'] = {
            'application/json': {
                'schema': schema(resp.type)
            }
        }
    }
    return result;
}

function schema(type: Type) {
    if( type.array ) {
        const result : Record<string, unknown> = {};
        result['type'] = 'array'
        if( type.maxItems ) {
            result['maxItems'] = type.maxItems
        }
        result['items'] = typeDef(type.typeDef)
        return result;
    } else {
        return typeDef(type.typeDef)
    }
}

function typeDef(tDef: TypeDef): Record<string, unknown> {
    if( tDef.refType && isAlias(tDef.refType.ref) ) {
        return typeDef(tDef.refType.ref.type.typeDef);
    }
    const result : Record<string, unknown> = {};

    if( isBuiltinStringFormats(tDef.builtinType) ) {
        result['type'] = 'string'
        if( tDef.builtinType !== 'string' ) {
            result['format'] = tDef.builtinType
        }
    } else if( isBuiltinIntegerFormats(tDef.builtinType) ) {
        result['type'] = 'integer'
    } else if( isBuiltinFloatFormats(tDef.builtinType) ) {
        result['type'] = 'number'
    } else if( isPrimitiveFloats(tDef.primitive) || isPrimitiveIntegers(tDef.primitive) ) {
        if( isPrimitiveFloats(tDef.primitive) ) {
            result['type'] = 'number'
            result['format'] = tDef.primitive.format;    
        } else {
            result['type'] = 'integer'
            result['format'] = tDef.primitive.format;    
        }
        if( tDef.primitive.lower !== undefined ) {
            result['minimum'] = tDef.primitive.lower
            if( tDef.primitive.lowerBound === '(' ) {
                result['exclusiveMinimum'] = true;
            }
        }
        if( tDef.primitive.upper !== undefined ) {
            result['maximum'] = tDef.primitive.upper
            if( tDef.primitive.upperBound === ')' ) {
                result['exclusiveMaximum'] = true;
            }
        }
    } else if( tDef.refType && isCustomType(tDef.refType.ref) ) {
        result['$ref'] = `#/components/schemas/${tDef.refType.ref.name}`;
    }

    return result;
}

function recursiveModel(modelType: ModelType, parent: Record<string, unknown>) {
    modelType.properties.forEach( p => {
        if( isStringLiteral(p.value) ) {
            parent[p.name] = p.value.value;
        } else if( isModelType(p.value) ) {
            const child = {};
            parent[p.name] = child;
            recursiveModel(p.value, child)
        } else if( p.values.length > 0 ) {
            const child : unknown[] = [];
            parent[p.name] = child;
            recursiveArray(p.values, child);
        }
    } )
}

function recursiveArray(values: ModelValue[], parent: unknown[]) {
    values.forEach( v => {
        if( isStringLiteral(v) ) {
            parent.push(v)
        } else if( isModelType(v) ) {
            const obj = {};
            recursiveModel(v, obj);
            parent.push(obj)
        }
    })
}

type APIDoc = {
    description: string
    summary?: string
    parameters?: Record<string, string>
}

function parseAPIDoc(apiDoc: string | undefined): APIDoc {
    if( apiDoc === undefined ) {
        return { description: '' };
    }

    if( apiDoc.startsWith('--') ) {
        return { description: apiDoc.substring(2).trim() }
    } else {
        const lines = apiDoc.split(/\r?\n/).map( l => {
            return l.replace('/\-','')
                .replace(/-\/$/,'')
                .replace(/^[\s|\-|\|]*/,'').trim()
        } )
        let summary
        let description = '';
        let currentParam: { name: string, doc: string } | undefined;
        let parameters: Record<string,string> = {};

        for( let i = 0; i < lines.length; i++ ) {
            const line = lines[i].trim();
            if( line.startsWith('@param ') ) {
                const noParam = line.substring('@param '.length).trim();
                const name = noParam.split(/\s+/)[0];
                const doc = noParam.substring(name.length).trim();
                currentParam = { name: name, doc: doc }
                
                continue;
            }

            if( line.length !== 0 ) {
                if( currentParam ) {
                    currentParam.doc += ' ' + line
                    parameters[currentParam.name] = currentParam.doc;
                } else if( description ) {
                    description += ' ' + line
                } else if( summary === undefined ) {
                    summary = line;
                } else {
                    summary += ' ' + line
                }
            } else {
                if( currentParam ) {
                    
                } else if( summary === undefined ) { // no first content yet
                    continue;
                } else if( lines[i+1] && lines[i+1].trim().length !== 0 && ! lines[i+1].startsWith('@') ) {
                    description = lines[i+1].trim();
                    i += 1;
                }
            }
        }

        if( description === '' && summary ) {
            description = summary;
            summary = undefined;
        }
        console.log(parameters);
        return { description, summary, parameters }
    }
}
