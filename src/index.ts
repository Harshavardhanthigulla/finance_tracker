import express  from "express"

const app = express()

app.get('/', (req, res) => {
  res.send('Hello, TypeScript Express!');
});

app.listen(5000, () => {
  console.log(`Server running at http://localhost:5000`);
});

