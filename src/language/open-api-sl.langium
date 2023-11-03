grammar OpenApiSl

entry Model:
    ('meta' model = ModelType)*
    ('types' '{' types += CustomType* '}')?
    ('endpoints' '{' endpoints += Endpoint* '}')?
;

ModelType:
    '{'
        properties += ModelProperty+
    '}'
;

ModelValue:
    ModelType | StringLiteral
;

ModelProperty:
    name=ID ':' (value=ModelValue | '[' values += ModelValue (',' values += ModelValue)* ']')
;

BuiltinIntegerFormats returns string:
    'int32' | 'int64'
;

BuiltinFloatFormats returns string:
    'float' | 'double'
;

BuiltinStringFormats returns string:
    'string' | 'password' | 'date' | 'date-time' | 'byte' | 'binary'
;

Builtin returns string:
    BuiltinStringFormats | BuiltinIntegerFormats | BuiltinFloatFormats;

PrimitiveString:
    type='string' '(' format=(ID|BuiltinStringFormats) ')'
;

PrimitiveFloats:
    'number' '(' format=(ID|BuiltinFloatFormats) ')' 
        (lowerBound=('('|'[') lower=INT? ',' upper=INT? upperBound=(')'|']'))?
        ('mul' multipleOf=UNSIGNED_NUMBER)?
;

PrimitiveIntegers:
    'integer' '(' format=(ID|BuiltinIntegerFormats) ')' 
        (lowerBound=('('|'[') lower=INT? ',' upper=INT? upperBound=(')'|']'))?
        ('mul' multipleOf=UNSIGNED_NUMBER)?
;

Primitive:
    PrimitiveString | PrimitiveFloats | PrimitiveIntegers;


ValueType:
    'type' name=ID ('(' descriminator=ID ('=' descriminatorValue=STRING)? ')')? ( 'extends' parents+= [ValueType:ID] ( ',' parents+= [ValueType:ID] )* )? '{'
        properties += Property*
    '}'
;

UnionType:
    'union' name=ID '=' types += [ValueType:ID] ( '|' types += [ValueType:ID] )+
;

Alias:
    'alias' name=ID '=' type=Type
;

CustomType:
    ValueType | UnionType | Alias;

Endpoint:
    name=ID 'at' path=STRING '{'
        paths += Path+
    '}'
;

Path:
    path=STRING '{'
        operations += Operation+
    '}'
;

Operation:
    type=('put'|'get'|'delete'|'patch'|'post') name=ID '(' (parameters += Parameter ( ',' parameters += Parameter* )? )? ')' '=>'
        respones += Response+
;

Response:
    code=(INT|'default') (':' type=Type)?
;

Parameter:
    in=('query'|'path'|'header'|'cookie'|'body') name=ID optional?='?'? ':' type=Type
    ;

Property:
    name=ID optional='?'? ':' type=Type
;

Type:
    (array?='array' '<' typeDef=TypeDef (',' maxItems=INT)? '>') | typeDef=TypeDef
;

TypeDef:
    (refType=[CustomType:ID] | builtinType=Builtin | primitive=Primitive ) nullable?='?'?
;

NumberLiteral:
    value=SIGNED_NUMBER|UNSIGNED_NUMBER
;

StringLiteral:
    value=STRING
;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal SIGNED_NUMBER returns number: /-\d+((\.\d+)?([eE][\-+]?\d+)?)?/;
terminal UNSIGNED_NUMBER returns number: /\d+((\.\d+)?([eE][\-+]?\d+)?)?/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
