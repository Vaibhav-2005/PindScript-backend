const express = require('express');
const cors = require('cors');
const { tokenize } = require('./lexer');
const { parse } = require('./parser');
const { run } = require('./interpreter');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/execute', (req, res) => {
  try {
    const code = req.body.code || '';
    const tokens = tokenize(code);
    const ast = parse(tokens);
    const output = run(ast);
    res.json({ output: output.join('\n') });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.listen(5000, () => console.log('PindScript server listening on port 5000'));




// Above code works very fine before while do while shit








