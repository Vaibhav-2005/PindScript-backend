// lexer.js — UNDERSCORE ONLY EDITION
const KEYWORDS = new Set([
  'mannle', 'vikha', 'je', 'fer', 'hor_je',      // Changed: hor_je
  'jadd_vi', 'jado', 'eh_kro', 'kamm', 'bhajo',  // Changed: jadd_vi, eh_kro
  'chaddo', 'langh_jaa'                          // Changed: langh_jaa
]);

const OPERATORS = new Set([
  '===', '!==', '==', '!=', '<=', '>=', '&&', '||', '++', '--',
  '+=', '-=', '*=', '/=', '+', '-', '*', '/', '%', '<', '>', '=', '!'
]);

const SINGLE_CHARS = {
  '(': 'LPAREN', ')': 'RPAREN',
  '{': 'LBRACE', '}': 'RBRACE',
  '[': 'LBRACKET', ']': 'RBRACKET',
  ';': 'SEMICOLON', ',': 'COMMA'
};

function isWhitespace(ch) { return /\s/.test(ch); }
function isDigit(ch) { return /[0-9]/.test(ch); }
function isIdStart(ch) { return /[A-Za-z_]/.test(ch); } 
function isIdPart(ch) { return /[A-Za-z0-9_]/.test(ch); } // REMOVED HYPHEN

function tokenize(input) {
  const tokens = [];
  let i = 0, line = 1, col = 1;

  function peek(n = 0) { return input[i + n]; }
  function next() {
    const ch = input[i++];
    if (ch === '\n') { line++; col = 1; } else col++;
    return ch;
  }
  function add(type, value, l, c) { tokens.push({ type, value, line: l, col: c }); }

  while (i < input.length) {
    let ch = peek();

    if (isWhitespace(ch)) { next(); continue; }

    // Comments
    if (ch === '/' && peek(1) === '/') { while (i < input.length && peek() !== '\n') next(); continue; }
    if (ch === '/' && peek(1) === '*') {
      next(); next();
      while (i < input.length && !(peek() === '*' && peek(1) === '/')) next();
      if (peek() === '*' && peek(1) === '/') { next(); next(); }
      continue;
    }

    // Strings
    if (ch === '"' || ch === "'") {
      const q = next(); let val = q; const l = line, c = col - 1;
      while (i < input.length) { 
        const char = next(); 
        val += char; 
        if (char === q) break; 
        if (i >= input.length) {
             throw new Error(`🛑 String band karni bhull gya?\n   (Technical Reason: Unterminated string literal starting at Line ${l})`);
        }
      }
      add('STRING', val, l, c); continue;
    }

    // Numbers
    if (isDigit(ch)) {
      let num = ''; const l = line, c = col;
      while (i < input.length && (isDigit(peek()) || peek() === '.')) num += next();
      add('NUMBER', num, l, c); continue;
    }

    // Keywords / Identifiers
    if (isIdStart(ch)) {
      let id = ''; const l = line, c = col;
      while (i < input.length && isIdPart(peek())) id += next();
      add(KEYWORDS.has(id) ? 'KEYWORD' : 'IDENTIFIER', id, l, c); continue;
    }

    // Operators
    const three = (peek()||'')+(peek(1)||'')+(peek(2)||'');
    if (OPERATORS.has(three)) { add('OPERATOR', three, line, col); next(); next(); next(); continue; }
    
    const two = (peek()||'')+(peek(1)||'');
    if (OPERATORS.has(two)) { add('OPERATOR', two, line, col); next(); next(); continue; }
    
    if (OPERATORS.has(ch)) { add('OPERATOR', ch, line, col); next(); continue; }

    // Punctuation
    if (SINGLE_CHARS[ch]) { add(SINGLE_CHARS[ch], next(), line, col); continue; }

    // UNKNOWN CHARACTER
    throw new Error(`🛑 Eh ki likh ditta? '${ch}' meri dictionary ch nahi hai.\n   (Technical Reason: Unknown/Unexpected Token at Line ${line})`);
  }
  return tokens;
}
module.exports = { tokenize };