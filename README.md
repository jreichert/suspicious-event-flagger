# Intro
This is an implementation of the [Prophet Backend Take Home Exercise](https://docs.google.com/document/d/1lt_fxbcd9hI-BQqw6YwAb9RHV-5gU7pNB2zlRcVzSfQ/edit).  This README will cover installation and usage instructions, discussion of design decisions and trade-offs, and elaboration on how it would be turned into production-quality code.

# Installation
## Prerequisites
This application is built using Express as the application layer and Redis as the data store.  


Node must be installed on the target system, and Redis must be available either on that target system or elsewhere.  There are multiple ways of setting these up for your target system; see the relevant application websites for details.  Note that because we are using Redis as our primary data store and not as a transient cache, it should be set up so that data in it is never expired.

Additionally, the application includes a Postman configuration file that can be used to test the application from within Postman.

* [Node.js](https://nodejs.org/en/download/package-manager)
* [Redis](https://redis.io/docs/latest/get-started/)
* [Postman (optional](https://www.postman.com/downloads/)

## Setup
1. Clone this repo to a directory of your choice.
2. Copy the file env.sample to .env and place it in the root directory of the application.
3. Replace the Redis connection information in that file as appropriate for your Redis installation.
4. In the root of the application directory, start the application with `npm run dev` (no prod target has been supplied for this exercise).  The application is now available at http://localhost:3000.

# Usage
## Postman
As this is an API-based application, the best way to test its functionality is to import the file `misc/Prophet - Backend.postman_collection.json` into your local Postman installation.  This file generates request entries in Postman for every endpoint in the system.  Once you are familiar with the endpoint functionality, you can call the APIs from within any external application.

This file makes use of Postman environment variables to easily do things like add new CIDR blocks, choose date ranges for event filtering, etc.  You can read more about how to set up Postman environment variables [here](https://learning.postman.com/docs/sending-requests/variables/managing-environments/).

## API Documentation

* `GET /cidrs`: Retrieve a list of all CIDR blocks in the configuration.
* `PUT /cidr`: Add a new CIDR block to the configuration.  This should be passed as a JSON object in the body of the request as follows: `{ "cidr": "192.168.0.0/24" }`.
* `DELETE /cidr`: Delete a CIDR block from the configuration.  This will only delete the named CIDR block and not any larger networks containing the block.
* `GET /events`: retrieve all events that were flagged as suspicious.  Includes basic date filtering by passing the optinal query params `start` and `end` (these should both be in Unix timstamp format).
* `PUT /events`: Send events to the system for investigation.  It expects a JSON array in the request body as input, so if you want to send a single event then it should be sent as a one-item array.
* `POST /ingest_events`: For test purposes only.  This loads the list of sample events from `util/events.json` and processes them.

# Design Information
[Read about the design of this application here.](./design.md)


