const AWS = require('aws-sdk');
let docClient = new AWS.DynamoDB.DocumentClient({'region':'us-west-2'});

exports.handler = async (event) => {
    console.log('hey1');
    let params = {
        TableName:'parkingLotDB',
        Limit:2
    };
    console.log('hey2');
    return await docClient.scan(params).promise();
};
