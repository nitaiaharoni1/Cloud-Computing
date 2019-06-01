const AWS = require('aws-sdk');
let awsConfig = require('C:/Users/nitai/.aws/local');
AWS.config.update(awsConfig);
let docClient = new AWS.DynamoDB.DocumentClient(/*{'region': 'us-west-2'}*/);

let handler = exports.handler = async (event, context) => {
    // console.log("Event: "+JSON.stringify(event, undefined, 2));
    // console.log("Context: "+JSON.stringify(context, undefined, 2));
    try {
        console.log("event.httpMethod: " + event.httpMethod);
        if (event.httpMethod === "GET") {
            let plate = event.queryStringParameters.plate,
                status = event.queryStringParameters.status,
                parkingLotId = event.queryStringParameters.parkingLotId;
            console.log("plate: " + plate);
            console.log("status: " + status);
            console.log("parkingLotId: " + parkingLotId);
            switch (status) {
                case "exit":
                    return exit(parkingLotId, plate);
                    break;
                case "enter":
                    console.log("Enter");
                    return enter(parkingLotId, plate);
                    break;
            }
        }
    } catch (e) {
        console.error(e);
        throw e;
    }
};

async function validateExit(plate, parkingLotId) {
    let params = {
        TableName: "parkingLotDb",
        KeyConditionExpression: `plate = :plate AND parkingLotId = :parkingLotId`,
        FilterExpression: 'exitTime = :0',
        ExpressionAttributeValues: {
            ':plate': plate,
            ':parkingLotId': parkingLotId,
            ':0': 0
        },
        ReturnConsumedCapacity: "TOTAL"
    };

    console.log("params: " + JSON.stringify(params));
    let res = await docClient.query(params).promise();
    console.log("res: " + JSON.stringify(res));
    if (res.Count > 0) {
        throw new Error("This car already entered this parking lot and didn't exit");
    }
}

async function putCar(plate, parkingLotId, enterTime, exitTime) {
    params = {
        TableName: 'parkingLotDb',
        Item: {
            "plate": plate,
            "parkingLotId": parkingLotId,
            "enterTime": enterTime,
            "exitTime": exitTime
        }
    };
    console.log("params: " + JSON.stringify(params));
    let res = await docClient.put(params).promise();
    console.log("res: " + JSON.stringify(res));
    return res;
}

async function updateCar(plate, parkingLotId, enterTime, exitTime) {
    params = {
        TableName: 'parkingLotDb',
        Item: {
            "plate": plate,
            "parkingLotId": parkingLotId,
            "enterTime": enterTime,
            "exitTime": exitTime
        }
    };
    console.log("params: " + JSON.stringify(params));
    let res = await docClient.update(params).promise();
    console.log("res: " + JSON.stringify(res));
    return res;
}

async function enter(parkingLotId, plate) {
    await validateExit(plate, parkingLotId);
    return await putCar(plate, parkingLotId, Date.now(), 0);
}

async function getLastEntrance(plate, parkingLotId) {
    let params = {
        TableName: "parkingLotDb",
        KeyConditionExpression: `plate = :plate AND parkingLotId = :parkingLotId`,
        FilterExpression: 'exitTime = :0',
        ExpressionAttributeValues: {
            ':plate': plate,
            ':parkingLotId': parkingLotId,
            ':0': 0,
        },
        ReturnConsumedCapacity: "TOTAL"
    };

    console.log("params: " + JSON.stringify(params));

    let res = await docClient.query(params).promise();
    console.log("res: " + JSON.stringify(res));
    if (res.Count !== 1) {
        throw new Error("Too many entrances without exits");
    }
    let lastEntrance = res.Items[0];
    return lastEntrance;
}

async function exit(parkingLotId, plate) {
    let lastEntrance = await getLastEntrance(plate, parkingLotId);
    return await updateCar(plate, parkingLotId, lastEntrance.enterTime, Date.now())
}

let event = {
    "httpMethod": "GET",
    "queryStringParameters": {
        "plate": "local",
        "parkingLotId": "local",
        "status": "exit"
    }
}

handler(event)
