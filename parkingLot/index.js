const AWS = require('aws-sdk');
const uniqid = require('uniqid');

let docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    //console.log("Event: " + JSON.stringify(event, undefined, 2));
    // console.log("Context: "+JSON.stringify(context, undefined, 2));
    try {
        console.log("event.path: " + event.path);
        let plate, status, parkingLotId;
        switch (event.path) {
            case "/notify":
                plate = event.queryStringParameters.plate;
                status = event.queryStringParameters.status;
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
            case "/lotReport":
                parkingLotId = event.queryStringParameters.parkingLotId;
                console.log("parkingLotId: " + parkingLotId);
                return await lotReport(parkingLotId);
            case "/userReport":
                plate = event.queryStringParameters.plate;
                console.log("plate: " + plate);
                return await userReport(plate);
        }
    } catch (e) {
        console.error(e);
        return {
            statusCode: 400,
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({"Error": e.message})
        }
    }
};

async function enter(parkingLotId, plate) {
    let res = await getCarStatus(plate, parkingLotId);
    if (res.ScannedCount === 0 || res.Count === 0) {
        await newCarEnter(plate, parkingLotId);
    } else {
        throw new Error("Too many entrances without exits");
    }
    return {
        statusCode: 200,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            "Success": `ENTER Car: ${plate}, Lot: ${parkingLotId}`
        })
    }
}

async function exit(parkingLotId, plate) {
    let res = await getCarStatus(plate, parkingLotId);
    //let lastEntrance = await getLastEntrance(plate, parkingLotId);
    if (res.Count < 1) {
        throw new Error("Can't Exit if didn't enter");
    } else if (res.Count > 1) {
        throw new Error("Too many entrances without exits");
    } else {
        await updateCarExit(res.Items[0].uniqid);
        return {
            statusCode: 200,
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                "Success": `EXIT Car: ${plate}, Lot: ${parkingLotId}`
            })
        }
    }
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
    return {
        statusCode: 200,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"Report": report})
    }
};

async function userReport(plate) {
    let params = {
        TableName: "parkingLotDb",
        IndexName: "plate-parkingLotId-index",
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
    return {
        statusCode: 200,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"Report": report})
    }

}

async function getCarStatus(plate, parkingLotId) {
    let params = {
        TableName: "parkingLotDb",
        IndexName: "plate-parkingLotId-index",
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
    return res;
}

async function newCarEnter(plate, parkingLotId) {
    let params = {
        TableName: 'parkingLotDb',
        Item: {
            "uniqid": uniqid(),
            "plate": plate,
            "parkingLotId": parkingLotId,
            "enterTime": Date.now(),
            "exitTime": 0
        },
        ReturnConsumedCapacity: "TOTAL",
    };
    console.log("params: " + JSON.stringify(params));
    let res = await docClient.put(params).promise();
    console.log("res: " + JSON.stringify(res));
    return res;
}

async function updateCarExit(uniqid) {
    let params = {
        TableName: 'parkingLotDb',
        Key: {
            "uniqid": uniqid,
        },
        "UpdateExpression": "set exitTime = :exitTime",
        "ExpressionAttributeValues": {
            ":exitTime": Date.now()
        },
    };
    console.log("params: " + JSON.stringify(params));
    let res = await docClient.update(params).promise();
    console.log("res: " + JSON.stringify(res));
    return res;
}



