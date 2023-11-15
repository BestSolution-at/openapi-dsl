grammar OpenApiSl

entry Model:
    ('meta' model = ModelType)*
    ('types' '{' types += CustomType* '}')?
    ( ('endpoints' '{' endpoints += Endpoint* '}') /*| ('channels' '{' channels+=Channel* '}')*/ )?
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
    doc=(ML_DOC_COMMENT|SL_DOC_COMMENT)?
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
    doc=(ML_DOC_COMMENT|SL_DOC_COMMENT)?
    name=ID optional='?'? ':' type=Type doc=SL_DOC_COMMENT?
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

Channel:
    'channel' name=ID 'at' path=STRING '{'
        subscription=Subscription?
        publish=Publish?
    '}'
;

Subscription:
    'subscribe' name=ID '(' (parameters+=ChannelOpParameter ( ',' parameters+=ChannelOpParameter )*)? ')'
;

Publish:
    'publish' name=ID '(' (parameters+=ChannelOpParameter ( ',' parameters+=ChannelOpParameter )*)? ')'
;

ChannelOpParameter:
    in=('header'|'payload') name=ID ':' type=Type
;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal SIGNED_NUMBER returns number: /-\d+((\.\d+)?([eE][\-+]?\d+)?)?/;
terminal UNSIGNED_NUMBER returns number: /\d+((\.\d+)?([eE][\-+]?\d+)?)?/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

terminal ML_DOC_COMMENT: /\/\-[\s\S]*?\-\//;
terminal SL_DOC_COMMENT: /-- [^\n\r]*/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;


