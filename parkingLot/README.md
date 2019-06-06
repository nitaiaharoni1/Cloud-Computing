# Parking Lot
AWS Lambda & dynamoDB parking application

## Usage
Host: 
```
https://oybopy61c3.execute-api.us-west-2.amazonaws.com/prod
```
##### Car Enter/Exit:
```
method: GET
path: /notify?parkingLotId=<PARKING LOT ID>&status=<STATUS>&plate=<CAR LICENSE PLATE>
```
- PARKING LOT ID is a string designating the specified parking lot.
- STATUS can be either "exit" or "enter".
- CAR LICENSE PLATE is the string of the car license plate.

Gets car enter/exit and store the parking record into DynamoDB.

##### Parking Lot Report:
```
method: GET
path: /lotReport?parkingLotId=<PARKING LOT ID>
```

-  PARKING LOT ID is a string designating the specified parking lot.

Gets a specific parking lot week report with plates number of the cars parked in it and their parking time.
##### User Car Report:
```
method: GET
path: /userReport?plate=<CAR LICENSE PLATE>
```
-  CAR LICENSE PLATE is the string of the car license plate.

Gets a specific user's car report with lot ids of the lots that the car parked in and it's parking time at each one of them.
##### User Charges:
dynamoDB Streams:
at each update of a car status (/notify), dynamoDB triggers a call to the lambda function which calculate the user's charge (5$ hourly charge),
 and d trigger a request to this url, if the user owe over 50$:
 ```
 http://charges.examples.com/charge?plate=<LICENSE PLATE>
 ```
 

## Data Modeling:
 
1. Table:
    - Partition key: uniqueId
    - *used to put unique items

2. GSI 1:
    - Partition key:  plate
    - Sort key:       parkingLotId
    - *used to validate and get car status before putting/updating a new car status

3. GSI 2:
    - Partition key:  parkingLotId
    - Sort key:       enterTime
    -  *used to get a week time lot report

4. GSI 3:
    - Partition key:  plate
    - Sort key:       enterTime
    - *used to get a month time user report

Concurrency:

Consistency:
