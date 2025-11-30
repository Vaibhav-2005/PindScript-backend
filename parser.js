// parser.js — UNDERSCORE ONLY EDITION
function parse(tokens) {
  let i = 0;
  function peek(n = 0) { return tokens[i + n]; }
  function next() { return tokens[i++]; }
  function atEnd() { return i >= tokens.length; }
  
  function expect(type, value) {
    const tk = peek();
    if (!tk || tk.type !== type || (value !== undefined && tk.value !== value)) {
      const got = tk ? (tk.value || tk.type) : 'Khatam (EOF)';
      const expected = value ? value : type;
      throw new Error(`🛑 Syntax galat hai, school ja wapis! (Expected '${expected}' but got '${got}')\n   (Technical Reason: Unexpected Token at Line ${tk ? tk.line : 'End'})`);
    }
    return next();
  }

  function parseProgram() {
    const body = [];
    while (!atEnd()) body.push(parseStatement());
    return { type: 'Program', body };
  }

  function parseStatement() {
    const tk = peek();
    if (!tk) throw new Error("🛑 Code adhura chhad ditta? (Unexpected End of Input)");

    if (tk.type === 'KEYWORD') {
      if (tk.value === 'mannle') return parseVarDecl();
      if (tk.value === 'kamm') return parseFunctionDecl();
      if (tk.value === 'bhajo') return parseReturnStmt();
      if (tk.value === 'chaddo') return parseBreakStmt();
      if (tk.value === 'langh_jaa') return parseContinueStmt(); // CHANGED
      if (tk.value === 'vikha') return parsePrint();
      if (tk.value === 'je') return parseIf();
      if (tk.value === 'jadd_vi') return parseFor();      // CHANGED
      if (tk.value === 'jado') return parseWhile();
      if (tk.value === 'eh_kro') return parseDoWhile();   // CHANGED
    }
    if (tk.type === 'LBRACE') return parseBlock();
    return parseExprStatement();
  }

  function parseBreakStmt() { expect('KEYWORD', 'chaddo'); expect('SEMICOLON'); return { type: 'BreakStmt' }; }
  function parseContinueStmt() { expect('KEYWORD', 'langh_jaa'); expect('SEMICOLON'); return { type: 'ContinueStmt' }; } // CHANGED

  function parseFunctionDecl() {
    expect('KEYWORD', 'kamm');
    const name = expect('IDENTIFIER').value;
    expect('LPAREN');
    const params = [];
    if (peek().type !== 'RPAREN') {
      do { params.push(expect('IDENTIFIER').value); } while (peek().type === 'COMMA' && next());
    }
    expect('RPAREN');
    const body = parseBlock();
    return { type: 'FunctionDecl', name, params, body };
  }

  function parseReturnStmt() {
    expect('KEYWORD', 'bhajo');
    let argument = null;
    if (peek().type !== 'SEMICOLON') argument = parseExpression();
    expect('SEMICOLON');
    return { type: 'ReturnStmt', argument };
  }

  function parseWhile() {
    expect('KEYWORD', 'jado');
    expect('LPAREN');
    const test = parseExpression();
    expect('RPAREN');
    const body = parseBlock();
    return { type: 'While', test, body };
  }

  function parseDoWhile() {
    expect('KEYWORD', 'eh_kro'); // CHANGED
    const body = parseBlock();
    expect('KEYWORD', 'jado');
    expect('LPAREN');
    const test = parseExpression();
    expect('RPAREN');
    expect('SEMICOLON');
    return { type: 'DoWhile', body, test };
  }

  function parseVarDecl() {
    expect('KEYWORD', 'mannle');
    const id = expect('IDENTIFIER').value;
    expect('OPERATOR', '=');
    const init = parseExpression();
    expect('SEMICOLON');
    return { type: 'VarDecl', id, init };
  }

  function parsePrint() {
    expect('KEYWORD', 'vikha');
    expect('LPAREN');
    const expr = parseExpression();
    expect('RPAREN');
    expect('SEMICOLON');
    return { type: 'Print', expr };
  }

  function parseIf() {
    expect('KEYWORD', 'je');
    expect('LPAREN');
    const test = parseExpression();
    expect('RPAREN');
    const consequent = parseBlock();
    let alternate = null;

    if (peek() && peek().type === 'KEYWORD') {
      if (peek().value === 'fer') {
        next();
        alternate = parseBlock();
      } else if (peek().value === 'hor_je') { // CHANGED
        next(); 
        expect('LPAREN');
        const elifTest = parseExpression();
        expect('RPAREN');
        const elifConsequent = parseBlock();
        let elifAlternate = null;
        if (peek() && (peek().value === 'fer' || peek().value === 'hor_je')) { // CHANGED
           elifAlternate = parseIfChainRest();
        }
        alternate = { type: 'If', test: elifTest, consequent: elifConsequent, alternate: elifAlternate };
      }
    }
    return { type: 'If', test, consequent, alternate };
  }
  
  function parseIfChainRest() {
    if (peek().value === 'fer') {
      next(); return parseBlock();
    } 
    if (peek().value === 'hor_je') { // CHANGED
      next(); expect('LPAREN');
      const test = parseExpression();
      expect('RPAREN');
      const consequent = parseBlock();
      let alternate = null;
      if (peek() && (peek().value === 'fer' || peek().value === 'hor_je')) { // CHANGED
        alternate = parseIfChainRest();
      }
      return { type: 'If', test, consequent, alternate };
    }
    return null;
  }

  function parseFor() {
    expect('KEYWORD', 'jadd_vi'); // CHANGED
    expect('LPAREN');
    let init = null;
    if (peek().type !== 'SEMICOLON') {
      if (peek().type === 'KEYWORD' && peek().value === 'mannle') init = parseVarDecl(); 
      else { init = parseExpression(); expect('SEMICOLON'); }
    } else expect('SEMICOLON');
    let test = null;
    if (peek().type !== 'SEMICOLON') test = parseExpression();
    expect('SEMICOLON');
    let update = null;
    if (peek().type !== 'RPAREN') update = parseExpression();
    expect('RPAREN');
    const body = parseBlock();
    return { type: 'For', init, test, update, body };
  }

  function parseBlock() {
    expect('LBRACE');
    const body = [];
    while (peek() && peek().type !== 'RBRACE') body.push(parseStatement());
    expect('RBRACE');
    return { type: 'Block', body };
  }

  function parseExprStatement() {
    const expr = parseExpression();
    expect('SEMICOLON');
    return { type: 'ExprStmt', expr };
  }

  function parseExpression() { return parseAssignment(); }

  function parseAssignment() {
    const left = parseLogical();
    if (peek() && peek().type === 'OPERATOR' && peek().value === '=') {
      next();
      const right = parseAssignment();
      if (left.type === 'Identifier') return { type: 'Assignment', id: left.name, value: right };
      if (left.type === 'MemberExpression') return { type: 'MemberAssignment', object: left.object, index: left.index, value: right };
      throw new Error("🛑 Oye! Value sirf variable ya array nu assign ho sakdi aa.\n   (Technical Reason: Invalid Left-Hand Side in Assignment)");
    }
    return left;
  }

  function parseLogical() {
    let expr = parseEquality();
    while (peek() && ['&&', '||'].includes(peek().value)) {
      expr = { type: 'Binary', operator: next().value, left: expr, right: parseEquality() };
    }
    return expr;
  }

  function parseEquality() {
    let expr = parseComparison();
    while (peek() && ['==', '!=', '===', '!=='].includes(peek().value)) {
      expr = { type: 'Binary', operator: next().value, left: expr, right: parseComparison() };
    }
    return expr;
  }

  function parseComparison() {
    let expr = parseTerm();
    while (peek() && ['<', '>', '<=', '>='].includes(peek().value)) {
      expr = { type: 'Binary', operator: next().value, left: expr, right: parseTerm() };
    }
    return expr;
  }

  function parseTerm() {
    let expr = parseFactor();
    while (peek() && ['+', '-'].includes(peek().value)) {
      expr = { type: 'Binary', operator: next().value, left: expr, right: parseFactor() };
    }
    return expr;
  }

  function parseFactor() {
    let expr = parseUnary();
    while (peek() && ['*', '/', '%'].includes(peek().value)) {
      expr = { type: 'Binary', operator: next().value, left: expr, right: parseUnary() };
    }
    return expr;
  }

  function parseUnary() {
    if (peek() && peek().type === 'OPERATOR' && ['!', '+', '-', '++', '--'].includes(peek().value)) {
      const op = next().value;
      const arg = parseUnary();
      if (op === '++' || op === '--') return { type: 'UpdateExpression', operator: op, argument: arg, prefix: true };
      return { type: 'Unary', operator: op, argument: arg };
    }
    return parseCall(); 
  }

  function parseCall() {
    let expr = parsePrimary();
    while (true) {
      if (peek() && peek().type === 'LPAREN') {
        next();
        const args = [];
        if (peek().type !== 'RPAREN') {
          do { args.push(parseExpression()); } while (peek().type === 'COMMA' && next());
        }
        expect('RPAREN');
        expr = { type: 'CallExpression', callee: expr, arguments: args };
      } else if (peek() && peek().type === 'LBRACKET') {
        next();
        const index = parseExpression();
        expect('RBRACKET');
        expr = { type: 'MemberExpression', object: expr, index };
      } else {
        break;
      }
    }
    if (peek() && peek().type === 'OPERATOR' && (peek().value === '++' || peek().value === '--')) {
        const op = next().value;
        expr = { type: 'UpdateExpression', operator: op, argument: expr, prefix: false };
    }
    return expr;
  }

  function parsePrimary() {
    const tk = peek();
    if (tk.type === 'NUMBER') { next(); return { type: 'Literal', value: Number(tk.value) }; }
    if (tk.type === 'STRING') { next(); return { type: 'Literal', value: tk.value.slice(1, -1) }; }
    if (tk.type === 'IDENTIFIER') { next(); return { type: 'Identifier', name: tk.value }; }
    if (tk.type === 'LPAREN') { next(); const e = parseExpression(); expect('RPAREN'); return e; }
    if (tk.type === 'LBRACKET') {
      next();
      const elements = [];
      if (peek().type !== 'RBRACKET') {
        do { elements.push(parseExpression()); } while (peek().type === 'COMMA' && next());
      }
      expect('RBRACKET');
      return { type: 'ArrayLiteral', elements };
    }
    throw new Error(`🛑 Kehda nasha karke code likheya? '${tk ? tk.value : 'EOF'}' samajh ni aaya.\n   (Technical Reason: Unexpected Token at Line ${tk ? tk.line : 'End'})`);
  }

  return parseProgram();
}
module.exports = { parse };