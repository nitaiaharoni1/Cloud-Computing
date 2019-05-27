const express = require("express");
const app = express();

app.get("/", function(req, res){
    res.status(200).send("Hello World!");
});

const port = process.env.port || 8081;

app.listen(port, () => {
    console.log('App running at port: ' + port)
});
