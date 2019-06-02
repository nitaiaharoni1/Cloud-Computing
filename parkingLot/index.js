const AWS = require('aws-sdk');
let awsConfig = require('C:/Users/nitai/.aws/local');
AWS.config.update(awsConfig);
let docClient = new AWS.DynamoDB.DocumentClient(/*{'region': 'us-west-2'}*/);

let handler = exports.handler = async (event, context) => {
    // console.log("Event: "+JSON.stringify(event, undefined, 2));
    // console.log("Context: "+JSON.stringify(context, undefined, 2));
    try {
        console.log("event.path: " + event.path);
        if (event.path === "/notify") {
            let plate = event.queryStringParameters.plate,
                status = event.queryStringParameters.status,
                parkingLotId = event.queryStringParameters.parkingLotId;
            console.log("plate: " + plate);
            console.log("status: " + status);
            console.log("parkingLotId: " + parkingLotId);
            switch (status) {
                case "exit":
                    return await exit(parkingLotId, plate);
                case "enter":
                    return await enter(parkingLotId, plate);
            }
        } else if (event.path === "/lotReport") {
            let parkingLotId = event.queryStringParameters.parkingLotId;
            return await lotReport(parkingLotId);
        } else if (event.path === "/userReport") {
            let plate = event.queryStringParameters.plate;
            return await userReport(plate);
        }
    } catch (e) {
        console.error(e);
        return {Error: e.message}
    }
};

async function enter(parkingLotId, plate) {
    await validateExit(plate, parkingLotId);
    await putCar(plate, parkingLotId, Date.now(), 0);
    return {"Success": `ENTER Car: ${plate}, Lot: ${parkingLotId}`}
}

async function exit(parkingLotId, plate) {
    let lastEntrance = await getLastEntrance(plate, parkingLotId);
    await updateCar(plate, parkingLotId, lastEntrance.enterTime, Date.now());
    return {"Success": `EXIT Car: ${plate}, Lot: ${parkingLotId}`}
}

async function lotReport(parkingLotId) {
    let params = {
        TableName: "parkingLotDb",
        IndexName: "parkingLotId-index",
        KeyConditionExpression: 'parkingLotId = :parkingLotId',
        ProjectionExpression: "plate, enterTime, exitTime",
        FilterExpression: 'enterTime > :weekAgo AND exitTime < :now',
        ExpressionAttributeValues: {
            ':now': Date.now(),
            ':weekAgo': Date.now() - (60 * 60 * 24 * 7 * 1000),
            ':parkingLotId': parkingLotId,
        },
        ReturnConsumedCapacity: "TOTAL"
    };
    let res = await docClient.query(params).promise();
    let report = {};
    await res.Items.forEach(function (item) {
        if (!report[item.plate]) {
            report[item.plate] = 0;
        }
        if (item.exitTime === 0) {
            item.exitTime = Date.now();
        }
        report[item.plate] += Math.floor(((item.exitTime - item.enterTime) / (1000 * 60 * 60)) * 100) / 100;
    });
    console.log("report: " + JSON.stringify(report));
    return report;
}

async function userReport(plate) {
    let params = {
        TableName: "parkingLotDb",
        KeyConditionExpression: 'plate = :plate',
        ProjectionExpression: "parkingLotId, enterTime, exitTime",
        FilterExpression: 'enterTime > :monthAgo AND exitTime < :now',
        ExpressionAttributeValues: {
            ':now': Date.now(),
            ':monthAgo': Date.now() - (60 * 60 * 24 * 30 * 1000),
            ':plate': plate,
        },
        ReturnConsumedCapacity: "TOTAL"
    };
    let res = await docClient.query(params).promise();
    let report = {};
    await res.Items.forEach(function (item) {
        if (!report[item.parkingLotId]) {
            report[item.parkingLotId] = 0;
        }
        if (item.exitTime === 0) {
            item.exitTime = Date.now();
        }
        report[item.parkingLotId] += Math.floor(((item.exitTime - item.enterTime) / (1000 * 60 * 60) * 100)) / 100;
    });
    console.log("report: " + JSON.stringify(report));
    return report;
}

async function validateExit(plate, parkingLotId) {
    let params = {
        TableName: "parkingLotDb",
        KeyConditionExpression: 'plate = :plate AND parkingLotId = :parkingLotId',
        FilterExpression: 'exitTime = :0',
        ExpressionAttributeValues: {
            ':plate': plate,
            ':parkingLotId': parkingLotId,
            ':0': 0
        },
        ReturnConsumedCapacity: "TOTAL"
    };
    let res = await docClient.query(params).promise();
    console.log("res: " + JSON.stringify(res));
    if (res.ScannedCount === 0 || res.Count === 0) {
        return res.Items[0];
    } else {
        throw new Error("Too many entrances without exits");
    }
};

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
    if (res.Count > 1) {
        throw new Error("Too many entrances without exits");
    } else if(res.Count < 1){
        throw new Error("Can't Exit if didn't enter");
    }
    return res.Items[0];
}

async function putCar(plate, parkingLotId, enterTime, exitTime) {
    let params = {
        TableName: 'parkingLotDb',
        Item: {
            "plate": {
                S: plate
            },
            "parkingLotId": {
                S: parkingLotId
            },
            "enterTime": {
                N: enterTime
            },
            "exitTime": {
                N: exitTime
            }
        },
        Exists: false,
        ReturnConsumedCapacity: "TOTAL",
    };
    console.log("params: " + JSON.stringify(params));
    let res = await docClient.put(params).promise();
    console.log("res: " + JSON.stringify(res));
    return res;
}

async function updateCar(plate, parkingLotId, enterTime, exitTime) {
    let params = {
        TableName: 'parkingLotDb',
        Key: {
            "plate": plate,
            "parkingLotId": parkingLotId
        },
        "ConditionExpression": "enterTime = :enterTime",
        "UpdateExpression": "set exitTime = :exitTime",
        "ExpressionAttributeValues": {
            ":enterTime": enterTime,
            ":exitTime": exitTime
        },
    };
    console.log("params: " + JSON.stringify(params));
    let res = await docClient.update(params).promise();
    console.log("res: " + JSON.stringify(res));
    return res;
}

let event = {
    "httpMethod": "GET",
    "path": "/userReport",
    "queryStringParameters": {
        "plate": "123456789",
        "parkingLotId": "1",
        "status": "enter"
    }
};

handler(event);
