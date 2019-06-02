const AWS = require('aws-sdk');
let awsConfig = require('C:/Users/i355539/.aws/local');
AWS.config.update(awsConfig);
const handler = require('./index').handler;

let enter = {
    "httpMethod": "GET",
    "path": "/notify",
    "queryStringParameters": {
        "plate": "123456789",
        "parkingLotId": "2",
        "status": "enter"
    }
};

let exit = {
    "httpMethod": "GET",
    "path": "/notify",
    "queryStringParameters": {
        "plate": "123456789",
        "parkingLotId": "1",
        "status": "exit"
    }
};

let userReport = {
    "httpMethod": "GET",
    "path": "/userReport",
    "queryStringParameters": {
        "plate": "123456789",
    }
};

let lotReport = {
    "httpMethod": "GET",
    "path": "/lotReport",
    "queryStringParameters": {
        "parkingLotId": "1",
    }
};

handler(userReport);
