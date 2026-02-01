# 🚀 NGINX Load Balancer with Node.js on a Single EC2 (Step-by-Step Guide)

This repository is a **complete hands-on guide** to setting up **NGINX as a load balancer** for multiple **Node.js (Express) servers** running on a **single AWS EC2 instance**.

👉 Follow this README **step by step** and you will be able to reproduce the entire setup from scratch.

---

## 🧠 What You Will Build

```
Client (Browser / Curl)
        ↓
NGINX (Port 80)
        ↓
---------------------------------
| Node.js App :3000              |
| Node.js App :3001              |
| Node.js App :3002              |
---------------------------------
```

* One EC2 instance
* Three Node.js servers (same codebase)
* NGINX acting as reverse proxy & load balancer
* PM2 managing Node processes

---

## ⚙️ Prerequisites

* AWS account
* Basic Linux commands
* Basic Node.js & Express knowledge
* SSH client

---

## 🧩 STEP 1 – Launch EC2 Instance

1. Launch an **EC2 instance** with:

   * OS: **Ubuntu 22.04**
   * Instance type: **t2.micro**
   * Public IP: **Enabled**

2. Configure **Security Group**:

   * SSH → Port **22** → Your IP
   * HTTP → Port **80** → `0.0.0.0/0`

❗ Do NOT expose ports `3000–3002` publicly.

---

## 🧩 STEP 2 – Connect to EC2

```bash
ssh ubuntu@<EC2_PUBLIC_IP>
```

---

## 🧩 STEP 3 – System Update

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 🧩 STEP 4 – Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y
```

Verify installation:

```bash
node -v
npm -v
```

---

## 🧩 STEP 5 – Install NGINX

```bash
sudo apt install nginx -y
```

Check status:

```bash
sudo systemctl status nginx
```

Open in browser:

```
http://<EC2_PUBLIC_IP>
```

✅ You should see the NGINX welcome page.

---

## 🧩 STEP 6 – Create Project Structure

```bash
mkdir load-balancer-nginx-nodejs
cd load-balancer-nginx-nodejs
mkdir express-app nginx screenshots
cd express-app
```

---

## 🧩 STEP 7 – Initialize Express App

```bash
npm init -y
npm install express
```

Create `app.js`:

```js
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send(`Response from server running on port ${PORT}`);
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
```

---

## 🧩 STEP 8 – Install PM2

```bash
sudo npm install -g pm2
```

---

## 🧩 STEP 9 – Start Multiple Node Servers

```bash
PORT=3000 pm2 start app.js --name server-3000
PORT=3001 pm2 start app.js --name server-3001
PORT=3002 pm2 start app.js --name server-3002
```

Verify:

```bash
pm2 list
```

---

## 🧩 STEP 10 – Test Node Servers Locally

```bash
curl localhost:3000
curl localhost:3001
curl localhost:3002
```

✅ Each response should show a different port.

---

## 🧩 STEP 11 – Configure NGINX as Load Balancer

Edit NGINX config:

```bash
sudo nano /etc/nginx/sites-available/default
```

Replace content with:

```nginx
upstream node_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;

    location / {
        proxy_pass http://node_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🧩 STEP 12 – Test & Reload NGINX

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧩 STEP 13 – Verify Load Balancing

Browser test:

```
http://<EC2_PUBLIC_IP>
```

Refresh multiple times — responses should rotate.

Curl test:

```bash
curl http://<EC2_PUBLIC_IP>
```

---

## 🧩 STEP 14 – Failure Test (Important)

Stop one server:

```bash
pm2 stop server-3001
```

Refresh browser again:

✅ App still works ✅ NGINX skips failed server

Restart:

```bash
pm2 start server-3001
```

---

## 🧩 STEP 15 – Save NGINX Config for Repo

```bash
cd ~/load-balancer-nginx-nodejs
sudo cp /etc/nginx/sites-available/default nginx/nginx.conf
```

---

## ✅ Final Outcome

* NGINX successfully load balances traffic
* Node servers are fault tolerant
* System is production-pattern ready

---

## 🔐 Security Notes

* Only port **80** is exposed publicly
* Node ports remain private
* NGINX acts as a secure gateway

---

## 🔜 Possible Improvements

* HTTPS with Let’s Encrypt
* Health checks
* Docker setup
* Multi-EC2 architecture

---

##
