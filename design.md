# Overview
This document discusses some of the design decisions made in the course of developing this application.

# High-Level Design
Based on the project requirements, this application is essentially a public API with a very light layer of business logic.  Consequently I have designed it the way I would design an API layer, using a fast, lightweight MVC framework and an appropriate data store.

## Data Store 

### Redis Layout
As Redis is a NoSQL database, it has no tables.  However, we are storing data in specific data structures as follows:

* **Bad IP addresses**: These are stored in an unsorted set as text strings.
* **Bad usernames**: These are also stored in an unsorted set as text strings.
* **Bad CIDR blocks**: These are stored in a sorted set, where the score used for sorting is the lowest IP address in the CIDR block.
* **Bad Events**: These are stored in a sorted set, where the score used for sorting is the unix timestamp of the event.  

The incoming event objects are augmented with two additional fields, `id` and `root_cause`.  ID is needed to avoid collisions if two events happen to occur at the exact same time but are otherwise identical.  It is also likely to be needed for reference by any consumer of this application.  Root_cause is useful for checking that the application works as expected with a give data set; in a production environment it could also be used to determine "hot spots" in activity.  This metadata could indicate events that are more urgent to examine than others.

### Rationale
These data structures were chosen 

### Rationale
* **Throughput**: It is likely that this application would need to scale to handle a large volume of incoming requests.  Redis has the speed of an-memory cache while also having the durability of on-disk persistence.
* **Set Operations**: Of the three ways in which an event could be marked as 'bad', two of them are set operations.  By simply maintaining a Redis Set of all known bad IPs and all known bad Users, it is trivial to check the IP and username in any given event against these two sets to see if the event came from a compromised username or ip.  
* **Idempotency**: Because most data in the application is stored in a set, this simplifies the process of managing changes to the data such as deletes or retries.  For example, to add a new User to our "users" set, we don't need to check if it already exists; we just add it to the set, and if it already exists in the set then this becomes a no-op (since sets are inherently unique, it is silently rejected).
* **Internal Sorting**: For determining if the ip of the event is part of a known bad CIDR block, Redis has a Sorted Set data structure that reduces the number of operations required.  If you provide an object to store in the set along with a 'score', this data structure will automatically sort the entries in the set by score.  This allows me to store CIDR blocks in a Sorted Set, where the score is simply the integer representation of the lowest IP address in the block.  For any incoming event, I then retrieve only the CIDR blocks with a score that is lower than the ip address of the event (since it isn't possible for the event to be in CIDR blocks which start at a higher IP than the event's IP).  For a production application tracking thousands or more bad CIDR blocks, this could represent substantial savings.  I also use a Sorted Set for storing events, where the score is the timestamp of the event.  This allows fast and easy filtering by date range when retrieving events.

The main disadvantage of a NoSQL data store is the lack of structured relationships between tables.  This application has very few data types and the links between them for the most part are unimportant (see "Undo Operations" below for a discussion of how to mitigate this in the cases where it does become important). 

In Summary, Redis is a great choice for this application because it is highly performant, has native data structures that are conducive to addressing the specific goals of this project, and its lack of relationships doesn't cause problems due to the lack of strong structured relationships between the data sets we need to store.


## Application Layer
### Structure
I have organized the Express app as follows:

* Main directory:
  * index.js: Node process startup and application endpoints.  In a larger application I would delegate the endpoints to their own related files in a `services` subdirectory, but that is unnecessary here given the small number of endpoints.
  * event_analyzer.js: This is the component that determines whether or not a given event should be marked suspicious.  Similar to index.js, in a larger application I would have separate files in a `src` directory for all associated business logic operations.
* /data: All data management functions.
  * db_client.js/redis.js: the generic object for carrying out database operations & the Redis db driver.
  * DAOs: wrappers around db_client to carry out specific data operations for events, cidr blocks, and ips.
* /misc: Contains request JSON that can be imported into Postman and events for application validation.

Redis configuration (and theoretically any other necessary config) is controlled using a .env file that is loaded into Node's memory using the dotenv() module.  This allows us to easily deploy the application into new environments, where the only change needed is to inject environment variables in a different way.  For example, in production these could be injected using GitHub Actions or AWS container services.  Note that this also keeps us from storing any sensitive information in version control.

### Workflow
As new events come in via `PUT /events`, the application first scans each one to determine if its IP address or username are found in the respective Redis sets.  

 
### Rationale
There are three different reasons that an event may be marked as suspicious, but according to the current feature requirements matching any one of these reasons is sufficient for an event to be marked.  Consequently, we want to first search our fastest data sets before moving to our slower ones.

We first check for a match on username or ip address because these set operations are very fast, completing in O(1) time.  If a match is found on either of these then we do not need to check CIDR blocks.  If no match is found in these then we move on to checking against our list of CIDR blocks in a sorted set.  This isn't quite as fast but still performs in O(log n) time (about the same as a SQL `WHERE` operation on an indexed column).

#### Speed vs Reliability
In this implementation, events are processed in batch.  This has the advantage of being faster, but at the expense of possibly overlooking some suspicious events.  If an event exists in a batch that would only be flagged as suspicious due to an earlier event in the same batch, in the current implementation it would not be flagged.  

The alternative to this approach would be to process events serially and to write users/ips to Redis as they are found; this would ensure that events later in the batch would be correctly flagged if they depended on events earlier in that batch.  While in a production application it is probable (but not guaranteed) that accuracy is more important than speed, I nonetheless chose the current design because there are fairly straightforward mitigation strategies to address this issue; these strategies would not be available if we were to process events serially.


1. The simplest way to handle this would be to submit events to `GET /events` with a smaller batch size; smaller batches will have fewer chances for overlooked events, but with higher processing times.  Submitting each event with a batch size of one would completely negate this issue.  This gives the application owner the ability to make this trade-off for themselves depending on the application goals.
2. A more elegant solution would be to keep a local array in memory of all known bad users and ips encountered during this single request.  The `contains()` function in UserDAO and IpDAO would be updated to first check these local arrays for matches, and if no match were found it would then continue on to checking in Redis for a match (as in the current implementation).  This would provide all the speed advantages of batch processing while also ensuring that no suspicious events are overlooked.

# Competing Options
## Data Store
Because I wanted the application to be as portable as possible, I originally considered using SQLite as the data store.  This would have made the codebase all-inclusive so it could be run without a 3rd-party dependency on Redis.  Furthermore, standard SQL operations could have been used for determining if an event was bad based on username of ip address (e.g. `SELECT COUNT(*) FROM events WHERE username = ? OR ip = ?`).  Finally, if I were to implement an 'unflag' operation for events, these relationships could potentially simplify the process of cascading deletes (see discussion on Unflagging below).

However, this ended up being an inferior choice for a few reasons.

1. Time Complexity.  Even on indexed columns, SQL databases typically have time complexity O(log n) when searching for a specific value.  By comparison, Set operations in Redis are O(1).  This gap becomes even more prominent when you consider that the 'n' in the O(log n) execution time of a SQL search isn't the number of known bad users; it is the number of *all bad events* (which is likely several orders of magnitudes higher). 
2. Ease of management.  CRUD operations for CIDR blocks, users, and ip addresses are simple set operations in Redis, but in a SQL database any foreign keys between these elements would need to be handled as well.
3. No need for ACID transactions.  All DB needs for this application are simple one-action commands.

## Application Layer
Due to the simplicity of this application, any MVC framework would work fine.  The async capabilities of Node make it an attractive option in general for designing an API layer, as multiple I/O operations can be spun off of the main process in parallel with ease.  Since APIs are often federating actions between other APIs or data stores, this is likely to come up at some point in the application's lifetime.  Note that in this particular application the effect is of limited value, though; Redis is single-threaded, so spawning multiple connections to it just means those connection requests will end up waiting in a queue on the other side anyway.  However, Node is still a good choice for future expansion possibilities (for example, sending suspicious events to another microservice for processing).

### Competing Options
For the reasons given above, other choices didn't need to be seriously considered given the scope of the exercise.  A similar lightweight framework such as Flask or Sinatra would provide similar performance.

A heavyweight application framework like Spring Boot would not be a good choice.  It would likely introduce excessive operational overhead for a simple application like this one.  One potential advantage of using a JVM-based framework, however, would be in having a shared memory realm to store the data structure representing the suspicious CIDR blocks.  In the current implementation, CIDR blocks to check are taken out in batches, have memory allocated for them in Node, and are checked one by one for an IP address match.  This batching step would not be necessary with a shared data structure for the union of all CIDR blocks, and would consequently yield increased application performance (at the cost of a potentially significant amount of memory required).  Threaded operations would also cut down on the incidence of events that could be missed due to timing issues (as threads could alert one another if they were given event data that may be valuable to a separate request being carried out in parallel).

While not directly relevant on technical merits, an additional reason for choosing Node from a leadership perspective is that it is relatively easy and inexpensive to hire Node developers.  Additionally, setup and management of NginX/Node clusters at scale isn't particularly hard compared to other options.

# Improvements
Of course this is not a production-ready application.  These are a few areas that have been skipped due to time.

* Proper error handling: A few error handling examples are present in the code but full error handling for every method would need to be added.
* Logging: all logging currently is through console.log, and most log statements exist for debugging purposes.  A production application would intentionally write easily parseable log lines with semantic meaning.
* Test Coverage: I have provided a number of tests using Vitest to show how I approach the creation of a unit test harness, but it is not fully fleshed out.  A production application would aim for 100% line coverage, as well as checking all possible outcomes from methods (e.g. in a method like `isItReal(thing)`, have tests for true, false, and throwing an Error where expected). Note that as a matter of practice I only test the public methods of any object; the expectation is that public methods should always "do the right thing", and non-public methods are allowed to be added, changed or removed at any time as long as that condition is satisfied. 

# Application Scaling
Of course this is not meant to be a production-ready application as-is.  This section outlines the broader system design tht could be used to productionalize the application.

## HA (High Availability) Architecture
The following is how I would envision deploying this application at scale.

* API Gateway: All API requests would go through a service such as AWS API Gateway.  Lambda functions would be added here for token-based auth and to add a circuit breaker if the app server is getting overloaded.
* Load Balancer: the gateway would forward the requests to a load balancer (such as AWS Application Load Balancer), which would in turn distribute requests to a pool of NginX servers.  SSL would be terminated at the load balancer.
* Reverse Proxy: NginX would handle the distribution of traffic among Node processes.  Each NginX instance would have a dedicated cluster of Node processes behind it.
* Application Servers: Node applications would be deployed as Docker containers in a Kubernetes cluster with proper autoscaling & health checks.

## Monitoring / Analytics
Proper logging would be added using [Winston](https://github.com/winstonjs/winston).  In addition to providing proper log levels in different environments, this would also allow adding different connectors for different data types.  For example, analytics data could be sent by a logger instance to a Lambda function that then fed data to Snowflake using Snowpipes.


## DB Scaling
The long pole in the tent for DB scaling will be the volume of events; over time, this will likely be orders of magnitude larger than storage of CIDR blocks, usernames or IP addresses.  By way of comparison, one estimate puts the **total** number of compromised IPv4 addresses at 4 million; this would require approximately 32 Mb of storage space. The event payloads in this application are approximately 200b each.  If this application were intended to process 1k events per second (which is quite conservative), this would require ~16gb of space per day's worth of events.

This would be a major driver of any design choices at scale.  However this is somewhat offset by the following:

* recency: more recent data is likely to be of more importance given the problem domain.
* availability: it is therefore probably acceptable if older data is not as immediately available.
* granularity: in general, older data is probably more valuable in aggregate than in individual events.  This gives us options for keeping data summaries and throwing away raw events after a certain period of time (for example, by saving a histogram of compromised IPs, tracked over time).

### Read Replicas
In practice this would likely be a very write-heavy application; the number of events read synchronously through the `GET /events` API would likely be a fraction of the events streamed to it for analysis.  Consequently read replicas wouldn't provide the benefit that they would in a read-heavy application (like Instagram).

### Data Offloading

In a production system, we would turn on cache expiration and use Redis Keyspace Notifications to emit events when data is being expired.  these events could be sent via Kafka to a pool of data storage workers that collect the data that is being expired and act on them (for example, it might dump the raw events to files, compress them, and send the compressed files to AWS Glacier).

### Sharding
If the above were not feasible or did not result in enough gains, then Events could be sharded in a number of ways.  Sharding by IP address in the event object is one strategy.  While simple, this introduces the possibility of hot spots since traffic is not usually distributed evenly across IP ranges.  Another strategy would be to create an MD5 hash of the event object itself, and use this as the sharding key.  This has the benefit of smoothing out the distribution across shards, at the expense of performing the hashing operation.  

# Specific Topics
This section addresses specific concerns that were asked for elaboration in the project instructions.

## Pagination and Filtering
Filtering is relatively straightforward.  I have shown how to use Sorted Sets to filter by date range in the existing code.  To filter by other fields, a new Redis data structure would be added for each field to be searched.  For example, if filtering by username were needed, then events would also be written to a Hash Set in Redis that maps username -> [event list].  This setup would also allow for searching on e.g. all usernames that start with "a".  

There are three main models for pagination: page-based, load more, and infinite scrolling.  The implementation would be highly dependent on the expect needs of API consumers.  These patterns are well described elswhere so I won't elaborate on their specific implementations.  However, given the very large volume of event data involved it should be noted that Sorted Sets work particularly well for pagination as they provide functionality similar to SQL cursors that allow you to retrieve data in batches from the data store.  All three patterns would make use of this for buffering data for output.

## Efficient Data Structures
This was largely covered in the topics above on the rationale for the current design and high availability improvements.  There is one further improvement that given time I would also make.  Right now we check a given IP against every candidate CIDR block in the system (where a 'candidate' is any block whose lowest IP is less than the target IP address).  We need to do that because CIDR blocks can be arbitrarily large (up to the size of the entire IPv4 space).  

However, we can do better than this by reducing the number of potential candidate matches using a data structure called an [interval tree](https://en.wikipedia.org/wiki/Interval_tree).  The algorithm would work as follows:

1. at application startup, read every CIDR block in the database.  
2. For each block, convert it into an ineger pair representing the start & end IPs for the range.
3. Store the block in the interval tree.
4. If this range overlaps with a range that is already in the interval tree, then the two ranges are merged together.
5. We match incoming event ips by seeing if they are contained in any interval in the tree.
6. As new CIDR blocks are added to the system we update this tree in addition to updating Redis.

Interval trees have time complexity O(log n), compared to checking an IP against each CIDR block one-by-one (which is O(n)). Furthermore, by merging ip ranges together, we reduce the magnitude of n; merging intervals together means decreasing the total number of CIDR block entries we check when searching (we want to leave them separate on disk because we may need to perform CRUD operations on them in the future).  

## Unflagging Events
This is a feature that can be anywhere from very simple to very complex depending on the specific business requirements.  If all that is required is a simple object delete then we would provide a `DELETE /event` endpoint that would delete based on the uuid assigned to the event (alternatively we could delete by matching one or more fields, with the additional risk that you may delete objects you didn't intend to).

However because earlier events cause later events to be marked as suspicious, there is an open question as to whether we should perform a cascading delete that would also delete those later, dependent events.  It is very likely that this would be required, but it is more complicated than simply following a chain of `event.root_cause` entries and deleting the objects as they are encountered.  Consider, for example, the following scenario:

* An event is received for user vevans from 192.168.122.15.
* 192.168.122.15 is in our list of suspicious IPs, so we mark the event as suspicious with a root_cause of "matches IP 192.168.122.15" and store it in Redis.  We store vevans as a suspicious user.
* We receive a 2nd event from user vevans with IP 206.16.28.33. 
* Our first check is for a matching user, and since vevans is a suspicious user we mark the 2nd event as suspicious, list the root_cause as "matches user vevans", and store it.
* We then move on to the next event to process.

Now suppose we receive a request to delete the *first* event.  It is tempting to say we should obviously cascase delete the 2nd event since it was triggered by the first one.  However let's examine one futher piece of information about the state of the system:

* We also have 206.16.28.0/24 listed as a suspicious CIDR block.  

This means there were actually *two* reasons the event could have been flagged even though we ended the loop after identifying just one reason.  Consequently even though the first event is deleted the 2nd one should not be deleted because there is another cause for it to be suspicious.

One might think the solution is as easy as checking for all three reasons rather than being satisfied when we find the first match.  This is still not guaranteed to work, though.  For example, suppose in the example above that CIDR block 206.16.28.0/24 was only added to the system *after* the 2nd event was added.  For a different type of application, we might say "that CIDR block wasn't added until after the 2nd event, which means it wasn't actually suspicious at the time the 2nd event was persisted."  But for a security application it is very possible that the CIDR block was already compromised when event 2 was added to the system - we simply didn't know it was compromised yet.

With that in mind, stakeholder questions like the following would be needed to clarify how this should be implemented:

* Are there ever cases where we should cascade delete?  If so, what are the criteria?
* If a CIDR block is added to the system should we assume that it may have already been bad before it was added here?  Is there some time frame around this (for example, assume that it could have been compromised somewhere in the last week, but further assume that it was unlikely to have been bad earlier than a week ago)?
* Should events be given a weight corresponding to how suspicious they are likely to be, and then we use that weight in making decisons about cascading deletes?

There is no single right answer here, and the design should address as many of the concerns as possible that are raised when asking these questions.

## Out of Order Events
The problem with out of order events is that later events can be triggered by earlier ones.  Consequently out of order events mean it is possible that triggering events may be missed.

Furthermore, the amount of time it could take for an errant event to come in is arbitrarily large.  In order to address this, then, we need to make a few assumptions:

1. The vast majority of events will occur in order.
2. If events are out of order, they will still be delivered to the system fairly close together in time.
3. If some small number of events don't arrive until much later than expected, we don't need to check for and fix any cascading issues in realtime.

Using these assumptions, we can use a model much like TCP packet sequencing to address this.  Rather than evaluating events immediately, we buffer them for some defined length of time.  We then resequence the events in the buffer before processing them and emptying the buffer for the next batch of events.

One important difference from TCP sequencing is that with TCP, the packet sequence number lets you know *for sure* if there are missing packets.  Because events do not come with explicit sequence numbers, we have no way of knowing if events are 'missing' from a stream.  Consequently we just have to get what we can in a reasonable time window and make use of that.

If it is truly critical that we never miss suspicious events, we will need a scheduled auditing/reprocessing job to handle it. This would likely require us to store every incoming event in a sorted set, and every day (or month, or year) fetch every event from that set in batches and run through the entire analysis process again.  This presents a host of other problems across systems, though, and would likely yield diminishing returns the longer your reprocessing intervals were. 