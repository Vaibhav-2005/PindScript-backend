// interpreter.js — WITH INFINITE LOOP GUARD

// --- 1. THE ROAST DICTIONARY ---
const ROASTS = {
    UNDECLARED: [
        "Oye! '{name}' labbhda firda? Pehlan banaya taan hai ni!",
        "Supne ch banaya si '{name}'? Asal ch taan hai ni.",
        "Ullu deya pathaya! '{name}' haje baneya ni."
    ],
    DUPLICATE: [
        "Ik wari '{name}' bana taan leya, hun ki achaar pauna dubara?",
        "Badam khaya kar! '{name}' pehla hi baneya hoya."
    ],
    TYPE_ERROR: [
        "Dimag theek aa? Eh operation ethe ni chalna.",
        "Jithe sui jani othe talwar ni jandi.",
        "Kaka, dimaag na kharaab kar!",
    ],
    MATH_ERROR: [
        "Hisaab kitab theek kar apna!",
        "0 naal divide karda? putha jameya si?",
    ],
    FUNCTION_ERROR: [
        "Ehnu Function wangu kyu call karda? Eh taan aiven hi hai.",
        "Gall tan theek aa, par tu kaun? (Not a function)"
    ],
    TIMEOUT: [
        "Oye bas kar! Loop hai ke jalebi? (Infinite Loop Detected)",
        "Browser hang karenga? Code thoda halka likh!",
        "Tera loop mukka ni, par mera saah mukk gya. (Time Limit Exceeded)"
    ],
    GENERIC: [
        "Dhillon ne kala coat awain ni paaya... Code theek kar!",
        "Kehda nasha karke code likheya?",
        "Dur fitteh mooh tere logic da!",
        "Dimag na la, ghutne dard karange!"
    ]
};

const TECH_EXPLAINS = {
    UNDECLARED: "Variable definition missing in scope.",
    DUPLICATE: "Variable name already exists in this scope.",
    TYPE_ERROR: "Invalid operation on this data type.",
    MATH_ERROR: "Division by Zero or Invalid Math Operation.",
    FUNCTION_ERROR: "Attempted to call a non-function value.",
    TIMEOUT: "Execution step limit exceeded (> 5000 steps). Likely an infinite loop.",
    GENERIC: "Runtime logic error."
};

// --- CONFIGURATION ---
const MAX_STEPS = 5000; // Safety break after 5000 operations

function throwMemeError(type, name = '', customTech = '') {
    const options = ROASTS[type] || ROASTS.GENERIC;
    const randomIndex = Math.floor(Math.random() * options.length);
    const msg = options[randomIndex].replace('{name}', name);
    const techMsg = customTech || TECH_EXPLAINS[type] || "Unknown Error";
    throw new Error(`🛑 ${msg}\n   (Technical Reason: ${techMsg})`);
}

// --- 2. ENVIRONMENT HELPERS ---
function createEnv(parent = null) { return Object.create(parent); }

function getVar(env, name) {
    let scope = env;
    while (scope) {
        if (Object.prototype.hasOwnProperty.call(scope, name)) return scope[name];
        scope = Object.getPrototypeOf(scope);
    }
    throwMemeError('UNDECLARED', name);
}

function setVar(env, name, value) {
    let scope = env;
    while (scope) {
        if (Object.prototype.hasOwnProperty.call(scope, name)) {
            scope[name] = value;
            return value;
        }
        scope = Object.getPrototypeOf(scope);
    }
    throwMemeError('UNDECLARED', name);
}

class ReturnValue { constructor(value) { this.value = value; } }
class BreakValue { }
class ContinueValue { }

// --- 3. SAFETY CHECKER ---
function checkGas(meta) {
    meta.steps++;
    if (meta.steps > MAX_STEPS) {
        throwMemeError('TIMEOUT');
    }
}

// --- 4. EVALUATION LOGIC ---
// We now pass 'meta' (steps + output) everywhere
function evaluateExpression(node, env, meta) {
    switch (node.type) {
        case 'Literal': return node.value;
        case 'Identifier': return getVar(env, node.name);
        case 'ArrayLiteral': return node.elements.map(e => evaluateExpression(e, env, meta));

        case 'MemberExpression': {
            const obj = evaluateExpression(node.object, env, meta);
            const idx = evaluateExpression(node.index, env, meta);
            if (Array.isArray(obj) || typeof obj === 'string') return obj[idx];
            throwMemeError('TYPE_ERROR', '', 'Cannot index this type. Only Arrays and Strings allow [].');
        }

        case 'MemberAssignment': {
            const obj = evaluateExpression(node.object, env, meta);
            const idx = evaluateExpression(node.index, env, meta);
            const val = evaluateExpression(node.value, env, meta);
            if (!Array.isArray(obj)) throwMemeError('TYPE_ERROR', '', 'Cannot assign index to non-Array.');
            obj[idx] = val;
            return val;
        }

        case 'CallExpression': {
            const callee = evaluateExpression(node.callee, env, meta);
            const args = node.arguments.map(arg => evaluateExpression(arg, env, meta));

            if (typeof callee === 'function') return callee(...args);

            if (callee && callee.type === 'FunctionDecl') {
                const funcEnv = createEnv(callee.closure);
                callee.params.forEach((param, i) => { funcEnv[param] = args[i]; });

                try {
                    // Pass meta so recursive calls share the same step counter and output buffer
                    executeBlock(callee.body, funcEnv, meta);
                } catch (e) {
                    if (e instanceof ReturnValue) return e.value;
                    throw e;
                }
                return null;
            }
            throwMemeError('FUNCTION_ERROR', '', `Type '${typeof callee}' is not callable.`);
        }

        case 'Unary': {
            const v = evaluateExpression(node.argument, env, meta);
            if (node.operator === '!') return !v;
            if (node.operator === '-') return -v;
            throwMemeError('GENERIC', '', `Unknown unary operator ${node.operator}`);
        }

        case 'UpdateExpression': {
            if (node.argument.type !== 'Identifier') throwMemeError('TYPE_ERROR', '', 'Increment/Decrement requires a variable name.');
            const name = node.argument.name;
            const oldVal = getVar(env, name);
            let newVal;
            if (node.operator === '++') newVal = oldVal + 1;
            else if (node.operator === '--') newVal = oldVal - 1;
            setVar(env, name, newVal);
            return node.prefix ? newVal : oldVal;
        }

        case 'Binary': {
            if (node.operator === '&&') {
                const left = evaluateExpression(node.left, env, meta);
                if (!left) return left;
                return evaluateExpression(node.right, env, meta);
            }
            if (node.operator === '||') {
                const left = evaluateExpression(node.left, env, meta);
                if (left) return left;
                return evaluateExpression(node.right, env, meta);
            }
            const a = evaluateExpression(node.left, env, meta);
            const b = evaluateExpression(node.right, env, meta);
            switch (node.operator) {
                case '+': return a + b;
                case '-': return a - b;
                case '*': return a * b;
                case '/':
                    if (b === 0) throwMemeError('MATH_ERROR', '', 'Divide by Zero is impossible.');
                    return a / b;
                case '%': return a % b;
                case '==': return a == b;
                case '!=': return a != b;
                case '<': return a < b;
                case '>': return a > b;
                case '<=': return a <= b;
                case '>=': return a >= b;
                default: throwMemeError('GENERIC', '', `Unknown binary operator ${node.operator}`);
            }
        }

        case 'Assignment': {
            const val = evaluateExpression(node.value, env, meta);
            return setVar(env, node.id, val);
        }
        default: throwMemeError('GENERIC', '', `Unknown Node Type: ${node.type}`);
    }
}

function executeStatement(node, env, meta) {
    // Check safety limit on every statement execution
    checkGas(meta);

    switch (node.type) {
        case 'VarDecl':
            if (Object.prototype.hasOwnProperty.call(env, node.id)) {
                throwMemeError('DUPLICATE', node.id);
            }
            env[node.id] = evaluateExpression(node.init, env, meta);
            break;

        case 'FunctionDecl':
            if (Object.prototype.hasOwnProperty.call(env, node.name)) {
                throwMemeError('DUPLICATE', node.name);
            }
            env[node.name] = { type: 'FunctionDecl', params: node.params, body: node.body, closure: env };
            break;

        case 'ReturnStmt':
            const val = node.argument ? evaluateExpression(node.argument, env, meta) : null;
            throw new ReturnValue(val);

        case 'BreakStmt': throw new BreakValue();
        case 'ContinueStmt': throw new ContinueValue();

        case 'Print':
            const text = String(evaluateExpression(node.expr, env, meta));
            meta.output.push(text);
            break;

        case 'If':
            if (evaluateExpression(node.test, env, meta)) executeBlock(node.consequent, createEnv(env), meta);
            else if (node.alternate) {
                if (node.alternate.type === 'Block') executeBlock(node.alternate, createEnv(env), meta);
                else executeStatement(node.alternate, createEnv(env), meta);
            }
            break;

        case 'While':
            while (evaluateExpression(node.test, env, meta)) {
                checkGas(meta); // Extra check inside loop
                try {
                    executeBlock(node.body, createEnv(env), meta);
                } catch (e) {
                    if (e instanceof BreakValue) break;
                    if (e instanceof ContinueValue) continue;
                    throw e;
                }
            }
            break;

        case 'DoWhile':
            do {
                checkGas(meta); // Extra check inside loop
                try {
                    executeBlock(node.body, createEnv(env), meta);
                } catch (e) {
                    if (e instanceof BreakValue) break;
                    if (e instanceof ContinueValue) continue;
                    throw e;
                }
            } while (evaluateExpression(node.test, env, meta));
            break;

        case 'For': {
            const loopEnv = createEnv(env);
            if (node.init) {
                if (node.init.type === 'VarDecl') loopEnv[node.init.id] = evaluateExpression(node.init.init, loopEnv, meta);
                else evaluateExpression(node.init, loopEnv, meta);
            }
            while (evaluateExpression(node.test, loopEnv, meta)) {
                checkGas(meta); // Extra check inside loop
                const bodyEnv = createEnv(loopEnv);
                try {
                    executeBlock(node.body, bodyEnv, meta);
                } catch (e) {
                    if (e instanceof BreakValue) break;
                    if (e instanceof ContinueValue) { /* continue */ }
                    else throw e;
                }
                if (node.update) evaluateExpression(node.update, loopEnv, meta);
            }
            break;
        }

        case 'Block':
            executeBlock(node, createEnv(env), meta);
            break;

        case 'ExprStmt':
            evaluateExpression(node.expr, env, meta);
            break;
    }
}

function executeBlock(block, env, meta) {
    for (const stmt of block.body) executeStatement(stmt, env, meta);
}

function run(ast) {
    // META object holds the state that needs to persist across recursion
    const meta = {
        steps: 0,
        output: []
    };

    const globalEnv = createEnv(null);

    // Standard Library
    globalEnv['true'] = true;
    globalEnv['false'] = false;

    globalEnv['lambai'] = (arg) => {
        if (Array.isArray(arg) || typeof arg === 'string') return arg.length;
        return 0;
    };
    globalEnv['thuss'] = (arr, val) => {
        if (Array.isArray(arr)) { arr.push(val); return arr.length; }
        throwMemeError('TYPE_ERROR', 'thuss', 'Expects Array as first argument');
    };
    globalEnv['kaddh'] = (arr) => {
        if (Array.isArray(arr)) return arr.pop();
        throwMemeError('TYPE_ERROR', 'kaddh', 'Expects Array as first argument');
    };
    globalEnv['agge_ho'] = (arr) => {
        if (Array.isArray(arr)) return arr.shift();
        throwMemeError('TYPE_ERROR', 'agge_ho', 'Expects Array as first argument');
    };
    globalEnv['palt'] = (arr) => {
        if (Array.isArray(arr)) { arr.reverse(); return arr; }
        throwMemeError('TYPE_ERROR', 'palt', 'Expects Array as first argument');
    }
    globalEnv['vadda_kro'] = (str) => {
        if (typeof str === 'string') return str.toUpperCase();
        return str;
    };
    globalEnv['chhota_kro'] = (str) => {
        if (typeof str === 'string') return str.toLowerCase();
        return str;
    };
    globalEnv['katt'] = (str, start, end) => {
        if (typeof str === 'string') return str.substring(start, end);
        return str;
    };
    globalEnv['labho'] = (str, term) => {
        if (typeof str === 'string') return str.indexOf(term);
        if (Array.isArray(str)) return str.indexOf(term);
        return -1;
    };

    try {
        executeBlock({ type: 'Block', body: ast.body }, globalEnv, meta);
        meta.output.push("\n✨ Balle! Code chal gya.");
    } catch (e) {
        if (!(e instanceof ReturnValue)) throw e;
    }
    return meta.output;
}

module.exports = { run };