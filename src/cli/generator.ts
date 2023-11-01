import { Endpoint, isModelType, isStringLiteral, ValueType, type Model, type ModelType, UnionType, isValueType, isUnionType, Property, isBuiltinStringFormats, isBuiltinIntegerFormats, isAlias, TypeDef, isBuiltinFloatFormats, isPrimitiveFloats } from '../language/generated/ast.js';
import * as fs from 'node:fs';
import { CompositeGeneratorNode, IndentNode, NL, toString } from 'langium';
import * as path from 'node:path';
import { extractDestinationAndName } from './cli-util.js';

export function generateJavaScript(model: Model, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.json`;

    const fileNode = new CompositeGeneratorNode();
    fileNode.append('{', NL)

    if( model.model ) {
        const modelType = model.model;  
        fileNode.indent( modelBody => {
            generateRecursiveModel(modelType, modelBody, true);
            if( model.endpoints.length > 0 ) {
                modelBody.append(`"paths": {`, NL)
                modelBody.indent( endpointBody => {
                    model.endpoints.forEach( e => generateEndoint(e, endpointBody) )
                });
                modelBody.append(`}`)
                if( model.types.length > 0 ) {
                    modelBody.append(',')
                }
                modelBody.appendNewLine();
            } else {
                modelBody.append(`"paths": {}`)
                if( model.types.length > 0 ) {
                    modelBody.append(',')
                }
                modelBody.appendNewLine();
            }
        } );
    }

    if( model.types.length > 0 ) {
        fileNode.indent( modelBody => {
            modelBody.append(`"components": {`, NL)
            modelBody.indent( componentBody => {
                componentBody.append(`"schemas": {`, NL)
                componentBody.indent( schemaBody => {
                    const valueTypes = model.types.filter( isValueType );
                    const unionTypes = model.types.filter( isUnionType );
                    valueTypes
                        .forEach( (t, idx) => generateValueType(t, schemaBody, unionTypes.length === 0 && valueTypes.length === idx + 1) )
                    unionTypes
                        .forEach( (t, idx) => generateUnionType(t, schemaBody, unionTypes.length === idx + 1) )
                });
                
                componentBody.append(`}`, NL)
            });
            modelBody.append(`}`, NL)
        });    
    }

    fileNode.append('}', NL)
    
    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }
    fs.writeFileSync(generatedFilePath, toString(fileNode));
    
    return generatedFilePath;
}

function generateEndoint(endpoint: Endpoint, endpointBody: IndentNode) {

}

function generateValueType(type: ValueType, schemaBody: IndentNode, last: boolean) {
    schemaBody.append(`"${type.name}": {`, NL)
    schemaBody.indent(typeBody => {
        generateValueTypeBody(type, typeBody);
    } )
    schemaBody.append(`}`)
    if( ! last ) {
        schemaBody.append(',')
    }
    schemaBody.appendNewLine();
}

function generateValueTypeBody(type: ValueType, typeBody: IndentNode) {
    if( type.parents.length > 0 ) {
        typeBody.append(`"allOf": [`, NL)
        typeBody.indent( allOfBody => {
            type.parents.forEach( p => {
                if( p.ref ) {
                    const ref = p.ref;
                    allOfBody.append('{', NL)
                    allOfBody.indent( objectTypeBody => {
                        objectTypeBody.append(`"$ref": "#/components/schemas/${ref.name}"`)
                    } )
                    allOfBody.append('},', NL)    
                }
            });
            allOfBody.append('{', NL)
            allOfBody.indent( objectTypeBody => {
                generateObjectType(type, objectTypeBody)
            } );
            allOfBody.append('}', NL)
        })
        typeBody.append(`]`, NL)
    } else {
        generateObjectType(type, typeBody)
    }
}

function generateObjectType(type: ValueType, objectTypeBody: IndentNode) {
    objectTypeBody.append(`"type": "object",`, NL)
    objectTypeBody.append(`"properties": {`, NL)
    objectTypeBody.indent( propertyBody => {
        if( type.descriminator ) {
            propertyBody.append( `"${type.descriminator}": {`, NL )
            propertyBody.indent( typeDefBody => typeDefBody.append('"type": "string"', NL) )
            propertyBody.append( `},`, NL )
        }
        type.properties.forEach( (p, idx) => {
            generateProperty(p, propertyBody, type.properties.length === idx + 1)
        });
    });
    
    objectTypeBody.append(`}`,NL)
}

function generateProperty(property: Property, propertyBody: IndentNode, last: boolean) {
    propertyBody.append(`"${property.name}": {`, NL)
    if( property.type.array ) {
        propertyBody.indent( arrayBody => {
            arrayBody.append(`"type": "array",`, NL)
            arrayBody.append(`"items": {`, NL)
            arrayBody.indent( typeDefBody => generateTypeDef(property.type.typeDef, typeDefBody) )
            arrayBody.append(`}`, NL)
        });
    } else {
        propertyBody.indent(typeDefBody => generateTypeDef(property.type.typeDef, typeDefBody))
    }
    propertyBody.append(`}`)
    if( ! last ) {
        propertyBody.append(',')
    }
    propertyBody.appendNewLine();
}

function generateTypeDef(typeDef: TypeDef, typeDefBody: IndentNode) {
    if( isBuiltinStringFormats(typeDef.builtinType) ) {
        typeDefBody.append(`"type": "string"`)
        
        if( typeDef.builtinType !== 'string' ) {
            typeDefBody.append(',', NL,`"format": "${typeDef.builtinType}"`)
        }
        typeDefBody.appendNewLine()
    } else if( isBuiltinIntegerFormats(typeDef.builtinType) ) {
        typeDefBody.append(`"type": "integer"`, NL)
    } else if( isBuiltinFloatFormats(typeDef.builtinType) ) {
        typeDefBody.append(`"type": "number"`, NL)
    } else if( isPrimitiveFloats(typeDef.primitive) ) {
        typeDefBody.append(`"type": "number",`, NL)
        typeDefBody.append(`"format": "${typeDef.primitive.format}"`)
        if( typeDef.primitive.lower !== undefined ) {
            typeDefBody.append(',', NL, `"minimum": ${typeDef.primitive.lower}`)
            if( typeDef.primitive.lowerBound === '(' ) {
                typeDefBody.append(',', NL, `"exclusiveMinimum": true`)
            }
        }
        if( typeDef.primitive.upper !== undefined ) {
            typeDefBody.append(',', NL, `"maximum": ${typeDef.primitive.upper}`)
            if( typeDef.primitive.upperBound === ')' ) {
                typeDefBody.append(',', NL, `"exclusiveMaximum": true`)
            }
        }
        typeDefBody.appendNewLine();
    } else if( typeDef.refType && isAlias(typeDef.refType.ref) ) {
        generateTypeDef(typeDef.refType.ref.type.typeDef, typeDefBody);
    } else if( typeDef.refType && isValueType(typeDef.refType.ref) ) {
        typeDefBody.append(`"$ref": "#/components/schemas/${typeDef.refType.ref.name}"`)
    }
}

function generateUnionType(type: UnionType, schemaBody: IndentNode, last: boolean) {
    schemaBody.append(`"${type.name}": {`, NL)
    schemaBody.indent( unionBody => {
        unionBody.append(`"oneOf": [`, NL)
        unionBody.indent( typeRefBody => {
            type.types.forEach( (t, idx) => {
                typeRefBody.append('{', NL)
                typeRefBody.indent( propBody => {
                    propBody.append(`"$ref": "#/components/schemas/${t.ref?.name}"`, NL)
                } )
                typeRefBody.append('}')
                if( idx + 1 !== type.types.length ) {
                    typeRefBody.append(',');
                }
                typeRefBody.appendNewLine();
            } )
        } );
        
        unionBody.append(`]`, NL)
    } )
    schemaBody.append(`}`)
    if( ! last ) {
        schemaBody.append(',')
    }
    schemaBody.appendNewLine();
}

function generateRecursiveModel(modelType: ModelType, modelBody: IndentNode, root: boolean) {
    modelType.properties.forEach( (p, idx) => {
        if( isStringLiteral(p.value) ) {
            modelBody.append(`"${p.name}": "${p.value.value}"${modelType.properties.length === idx + 1 ?'':','}`, NL)
        } else if( isModelType(p.value) ) {
            const subType = p.value;
            modelBody.append(`"${p.name}": {`, NL)
            modelBody.indent( subModelBody => {
                generateRecursiveModel(subType, subModelBody, false);
            });
            modelBody.append(`}`)
            if( modelType.properties.length !== idx + 1 || root ) {
                modelBody.append(',')
            }
            modelBody.appendNewLine();
        } else if( p.values.length > 0 ) {
            modelBody.append(`"${p.name}": [`, NL)
            modelBody.indent( arrayContent => {
                p.values.forEach( v => {
                    if( isStringLiteral(v) ) {
                        arrayContent.append(`"${v}"`)
                    } else {
                        arrayContent.append('{',NL)
                        arrayContent.indent( subModelBody => generateRecursiveModel(v, subModelBody, false))
                        arrayContent.append('}',NL)
                    }
                } );
            });
            modelBody.append(`]`)
            if( modelType.properties.length !== idx + 1 || root ) {
                modelBody.append(',')
            }
            modelBody.appendNewLine();
        }
    } )
}
