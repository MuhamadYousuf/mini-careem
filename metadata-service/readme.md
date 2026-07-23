# Metadata Service

## Tech Stack & Justification
This microservice is built using **Node.js (Express)**, **SQLite**, and **Redis**. Node.js was chosen because its non-blocking I/O model handles high-frequency API routing and rapid cache reads with minimal overhead. SQLite acts as a lightweight, isolated primary database, ensuring zero coupling with other microservices. Redis provides an in-memory RAM caching layer that absorbs traffic spikes during rush-hour price checks.

## Graceful Degradation
When a request arrives, the app checks Redis. If Redis is down or unreachable, an error listener catches the connection fault and automatically redirects the read query to SQLite. The app will never crash due to a Redis failure.