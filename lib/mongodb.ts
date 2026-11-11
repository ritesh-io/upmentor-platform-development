import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI

if (!uri) {
  throw new Error("MONGODB_URI must be configured for UpMentor authentication.")
}

declare global {
  var upmentorMongoClient: MongoClient | undefined
}

export const mongoClient = globalThis.upmentorMongoClient ?? new MongoClient(uri, { maxPoolSize: 10 })

if (process.env.NODE_ENV !== "production") {
  globalThis.upmentorMongoClient = mongoClient
}

export const authDb = mongoClient.db(process.env.UPMENTOR_AUTH_DATABASE || "upmentor_identity")
