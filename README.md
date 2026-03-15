# System Architecture Overview: File Upload & Synchronization

This document outlines the components and data flow of the distributed system architecture used for efficient file storage, retrieval, and cross-client synchronization.

---

## 1. Core Components

### **Clients**
The entry point of the system. This includes various devices such as **Laptops (Web)** and **Smartphones (Mobile)**. Clients interact with the system to upload new files or download existing ones.

### **CDN (Content Delivery Network)**
A distributed network of servers that caches content close to the user. 
* **Role:** Handles the "Download" flow to reduce latency and save origin bandwidth.

### **Load Balancer**
Acts as a traffic cop, distributing incoming API requests from clients across multiple instances of the Application Server to ensure high availability and reliability.

### **Application Server**
The "Brain" of the operation. It handles internal logic through two main sub-components:
* **Authentication:** Verifies user identity and permissions before allowing any operations.
* **Rate Limiter:** Prevents abuse by limiting the number of requests a user can make in a given timeframe.

### **Amazon S3 (Blob Storage)**
The actual storage layer for large files (images, videos, documents). 
* **Optimization:** Instead of sending files through the Application Server, the server provides a **Presigned URL**, allowing the client to upload directly to S3.

### **Metadata Storage**
A database (typically NoSQL like Cassandra or a relational DB) that stores information *about* the files, such as file name, size, owner, and the S3 URL path.

### **Synchronization Server**
Responsible for ensuring that all of a user's devices are up to date. When a file is uploaded on one device, this server pushes updates to others.

### **Message Queue**
A buffer (like Kafka or RabbitMQ) that facilitates asynchronous communication between the Synchronization Server and the Clients. It ensures messages are delivered even if a client is temporarily offline.

---

## 2. Data Flow Processes

### **A. The Upload Path (Red/Blue Lines)**
1.  **Request:** Client requests an upload via the **Load Balancer**.
2.  **Authorize:** **Application Server** authenticates the user and returns a **Presigned URL**.
3.  **Direct Upload:** Client uploads the file directly to **Amazon S3** using that URL.
4.  **Completion:** Once the upload is finished, S3 (or the client) triggers an "Upload Complete" signal to the **Metadata Storage**.

### **B. The Download Path (Green Line)**
1.  **Request:** Client requests a file.
2.  **Delivery:** The file is served via the **CDN**. If the file is cached, it is delivered instantly; otherwise, it is fetched from S3 and then cached.

### **C. The Sync Path (Purple Lines)**
1.  **Update:** Once metadata is updated, the **Synchronization Server** is notified.
2.  **Queue:** The server pushes a notification into the **Message Queue**.
3.  **Notify:** The queue pushes the update to all other connected **Clients**, prompting them to refresh their view or download the new data.