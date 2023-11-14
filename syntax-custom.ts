// Monarch syntax highlighting for the open-api-sl language.
export default {
    keywords: [
        'alias','array','at','binary','body','byte','cookie','date','date-time','default','delete','double','endpoints','extends','float','get','header','int32','int64','integer','meta','mul','number','password','patch','path','post','put','query','string','type','types','union'
    ],
    operators: [
        ',',':','<','=','=>','>','?','|'
    ],
    symbols: /\(|\)|,|:|<|=|=>|>|\?|\[|\]|\{|\||\}/,

    tokenizer: {
        initial: [
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
            { regex: /[0-9]+/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"number"} }} },
            { regex: /-\d+((\.\d+)?([eE][\-+]?\d+)?)?/, action: {"token":"number"} },
            { regex: /\d+((\.\d+)?([eE][\-+]?\d+)?)?/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"number"} }} },
            { regex: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/, action: {"token":"string"} },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': {"token":"operator"}, '@default': {"token":""} }} },
        ],
        whitespace: [
            { regex: /\s+/, action: {"token":"white"} },
            { regex: /\/\*/, action: {"token":"comment","next":"@comment"} },
            { regex: /\/\/[^\n\r]*/, action: {"token":"comment"} },
            { regex: /-- [^\n\r]*/, action: { "token": "comment.doc" } },
            { regex: /\/\-(?!\/)/, action: { "token" : 'comment.doc', "next": '@apidoc' } },
        ],
        comment: [
            { regex: /[^/\*]+/, action: {"token":"comment"} },
            { regex: /\*\//, action: {"token":"comment","next":"@pop"} },
            { regex: /[/\*]/, action: {"token":"comment"} },
        ],
        apidoc: [
            { regex: /[^\/-]+/, action: { token: 'comment.doc' }},
			{ regex: /\-\//, action: { token: 'comment.doc', "next": '@pop'} },
			{ regex: /[\/-]/, action: { token: 'comment.doc'} }
        ],
    }
};
