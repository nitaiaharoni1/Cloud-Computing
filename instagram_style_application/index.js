const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const aws = require('aws-sdk');
const isImage = require('is-image');
const config = require('./config');
const app = express();
const fs = require('fs');

const multer = require('multer')
const fileUpload = require('express-fileupload');

const upload = multer({dest: './uploads/'});
app.use(express.static(path.join(__dirname, 'view')))
app.use(express.static(path.join(__dirname, 'src')))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(fileUpload());

aws.config.setPromisesDependency();
aws.config.update({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    signatureVersion: 'v4'
});
const s3 = new aws.S3();

app.get('/', async function(req, res){
    await res.sendFile(__dirname + '/view/wall.html');
});

app.get('/pictures', async function(req, res){
    let files = await s3.listObjects({Bucket: "instag-style-application"}).promise();
    let requests = files.Contents.map(async function(file){
        let params = {
            Bucket: "instag-style-application",
            Key: file.Key,
            Expires: 60 * 5
        };
        let url = await s3.getSignedUrl('getObject', params);
        console.log(url);
        return new Promise((resolve) => {
            resolve(url);
        });
    });
    Promise.all(requests).then(urls => {
        res.send(urls)
    });
});

app.post('/picture', async function(req, res){
    try{
        let image = req.files.image_file;
        let params = {
            Bucket: "instag-style-application",
            Key: image.name,
            Body: image.data
        };
        let response = await s3.upload(params).promise();
        await res.send(response.key);
    } catch(e){
        console.log(e);
        res.send(e);
    }
});

const port = process.env.port || 3000;
app.listen(port, () => {
    console.log("App is listening on port: " + port)
});
