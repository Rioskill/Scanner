import { MongoClient } from 'mongodb';

const mongoURI = "mongodb://admin:admin@mongo:27017/?authMechanism=DEFAULT&authSource=scanner"
const dbName = 'scanner';

const dbClient = new MongoClient(mongoURI);
const db = dbClient.db("scanner");

const request_collection = db.collection("requests");
const response_collection = db.collection("responses");

export {request_collection, response_collection};
